/**
 * 대시보드 전용 통합 API
 *
 * GET /api/dashboard
 *
 * 기존에 프론트에서 7개의 개별 요청으로 처리하던 것을
 * 단 1번의 요청으로 모든 대시보드 데이터를 반환합니다.
 *
 * 포함 데이터:
 *   - districtSummary  : 서울 25개 구별 실거래 요약
 *   - topComplexes     : 서울 최고가 단지 TOP 4
 *   - nationalStats    : 전국 실거래 요약
 *   - recentTx         : 강남·마포·용산 최근 실거래 (각 4건)
 *
 * ✅ 성능 전략:
 *   1. 서울 25개 구 실거래를 먼저 병렬 수집 (fetchSaleTransactions × 25)
 *   2. 수집한 데이터를 공유 캐시(tx:{code}:{ym}:sale)에 저장
 *   3. topComplexes / nationalStats / recentTx 는 캐시 히트로 즉시 집계
 *   → 외부 API 호출 횟수를 최소화
 */
import { Router, type Request, type Response } from 'express';
import {
  fetchSaleTransactions,
  aggregateByComplex,
  getRecentMonths,
} from '../services/rebTransactions.js';
import { DISTRICT_CODES, type Transaction } from '../types.js';
import { cache, TTL, txCacheKey } from '../services/cache.js';

const router = Router();

/** 서울 구별 요약 계산 */
function calcDistrictSummary(txs: Transaction[], district: string) {
  if (txs.length === 0) return { district, count: 0, avgPrice: 0, maxPrice: 0, minPrice: 0 };
  const prices = txs.map(t => t.price);
  return {
    district,
    count: txs.length,
    avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
    maxPrice: Math.max(...prices),
    minPrice: Math.min(...prices),
  };
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    // ── 전체 결과 캐시 확인 ───────────────────────────────────────
    const masterKey = 'dashboard:v1';
    const masterCached = cache.get<unknown>(masterKey);
    if (masterCached) {
      return res.json({ success: true, data: masterCached, cached: true });
    }

    const [currentMonth, prevMonth] = getRecentMonths(2);
    const seoulEntries = Object.entries(DISTRICT_CODES).filter(([name]) => name.startsWith('서울 '));

    // ── STEP 1: 서울 25개 구 × 최근 2달 실거래 병렬 수집 ─────────
    // 이미 캐시에 있는 구/달은 즉시 반환, 없는 것만 API 호출
    const seoulTxMap = new Map<string, Transaction[]>(); // code → txs

    await Promise.allSettled(
      seoulEntries.map(async ([, code]) => {
        const [curTxs, prevTxs] = await Promise.all([
          (async () => {
            const key = txCacheKey(code, currentMonth, 'sale');
            let txs = cache.get<Transaction[]>(key);
            if (!txs) {
              txs = await fetchSaleTransactions(code, currentMonth);
              if (txs.length > 0) cache.set(key, txs, TTL.DISTRICT);
            }
            return txs ?? [];
          })(),
          (async () => {
            const key = txCacheKey(code, prevMonth, 'sale');
            let txs = cache.get<Transaction[]>(key);
            if (!txs) {
              txs = await fetchSaleTransactions(code, prevMonth);
              if (txs.length > 0) cache.set(key, txs, TTL.DISTRICT);
            }
            return txs ?? [];
          })(),
        ]);
        // 이번 달 우선, 없으면 전달
        seoulTxMap.set(code, curTxs.length > 0 ? curTxs : prevTxs);
      }),
    );

    // ── STEP 2: 서울 구별 요약 집계 ──────────────────────────────
    const districtSummary = seoulEntries.map(([districtName, code]) =>
      calcDistrictSummary(seoulTxMap.get(code) ?? [], districtName),
    );

    // ── STEP 3: 서울 최고가 단지 TOP 4 ───────────────────────────
    const allSeoulComplexes: Array<{
      complexName: string; neighborhood: string; district: string;
      avgPrice: number; minPrice: number; maxPrice: number;
      transactionCount: number; recentTransactions: Transaction[];
    }> = [];

    for (const [districtName, code] of seoulEntries) {
      const txs = seoulTxMap.get(code) ?? [];
      if (txs.length === 0) continue;
      const stats = aggregateByComplex(txs);
      for (const s of stats.values()) {
        allSeoulComplexes.push({
          complexName: s.complexName,
          neighborhood: s.neighborhood,
          district: districtName,
          avgPrice: s.avgPrice,
          minPrice: s.minPrice,
          maxPrice: s.maxPrice,
          transactionCount: s.transactions.length,
          recentTransactions: s.transactions.slice(0, 3),
        });
      }
    }
    const topComplexes = allSeoulComplexes.sort((a, b) => b.maxPrice - a.maxPrice).slice(0, 4);

    // ── STEP 4: 전국 통계 (캐시 히트 기대, 없으면 전국 병렬 수집) ─
    const nationalCacheKey = 'national-stats:latest';
    let nationalStats = cache.get<{
      totalCount: number; avgPrice: number; maxPrice: number;
      topDistrict: { district: string; count: number } | null;
    }>(nationalCacheKey);

    if (!nationalStats) {
      const allEntries = Object.entries(DISTRICT_CODES);
      const natResults = await Promise.allSettled(
        allEntries.map(async ([districtName, code]) => {
          const txArrays = await Promise.all(
            [currentMonth, prevMonth].map(async ym => {
              const key = txCacheKey(code, ym, 'sale');
              let txs = cache.get<Transaction[]>(key);
              if (!txs) {
                txs = await fetchSaleTransactions(code, ym);
                if (txs.length > 0) cache.set(key, txs, TTL.TRANSACTION);
              }
              return txs ?? [];
            }),
          );
          const txs = txArrays.flat();
          return { district: districtName, count: txs.length, prices: txs.map(t => t.price) };
        }),
      );
      const byDistrict = natResults
        .filter((r): r is PromiseFulfilledResult<{ district: string; count: number; prices: number[] }> => r.status === 'fulfilled')
        .map(r => r.value);

      const totalCount = byDistrict.reduce((s, d) => s + d.count, 0);
      const allPrices = byDistrict.flatMap(d => d.prices);
      const topByVolume = byDistrict.filter(d => d.count > 0).sort((a, b) => b.count - a.count)[0] ?? null;

      nationalStats = {
        totalCount,
        avgPrice: allPrices.length ? Math.round(allPrices.reduce((s, p) => s + p, 0) / allPrices.length) : 0,
        maxPrice: allPrices.length ? Math.max(...allPrices) : 0,
        topDistrict: topByVolume ? { district: topByVolume.district, count: topByVolume.count } : null,
      };
      if (totalCount > 0) cache.set(nationalCacheKey, nationalStats, TTL.DISTRICT);
    }

    // ── STEP 5: 강남·마포·용산 최근 실거래 (캐시 히트) ─────────
    const featuredDistricts: [string, string][] = [
      ['서울 강남구', DISTRICT_CODES['서울 강남구']],
      ['서울 마포구', DISTRICT_CODES['서울 마포구']],
      ['서울 용산구', DISTRICT_CODES['서울 용산구']],
    ];

    const recentTx: Record<string, Transaction[]> = {};
    await Promise.allSettled(
      featuredDistricts.map(async ([districtName, code]) => {
        // 이미 seoulTxMap에 현재 달 데이터가 있으면 바로 사용
        let txs = seoulTxMap.get(code) ?? [];
        if (txs.length < 4) {
          // fallback: 6개월 범위로 재조회
          const months6 = getRecentMonths(6);
          const txArrays = await Promise.all(
            months6.map(async ym => {
              const key = txCacheKey(code, ym, 'sale');
              const cached = cache.get<Transaction[]>(key);
              if (cached) return cached;
              const fetched = await fetchSaleTransactions(code, ym);
              if (fetched.length > 0) cache.set(key, fetched, TTL.TRANSACTION);
              return fetched;
            }),
          );
          txs = txArrays.flat();
        }
        txs.sort((a, b) => b.dealDate.localeCompare(a.dealDate));
        recentTx[districtName] = txs.slice(0, 4);
      }),
    );

    // ── 최종 응답 구성 ────────────────────────────────────────────
    const data = {
      districtSummary,
      topComplexes,
      nationalStats,
      recentTx,
    };

    // 대시보드 결과 전체를 1시간 캐시 (공유 캐시 워밍 후에는 즉시 반환)
    cache.set(masterKey, data, 1000 * 60 * 60);

    return res.json({ success: true, data, cached: false });
  } catch (err) {
    console.error('[/api/dashboard]', err);
    return res.status(500).json({ success: false, error: '대시보드 데이터 조회 실패' });
  }
});

export default router;
