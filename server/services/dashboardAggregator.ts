/**
 * 대시보드 데이터 집계 로직
 *
 * /api/dashboard 요청 경로와 /api/cron/refresh-dashboard 갱신 경로가
 * 동일한 계산을 공유하도록 분리한 모듈.
 * 이 함수는 실제로 공공 API를 호출하므로 무겁고 느리다 —
 * 사용자 요청 경로에서 직접 부르지 말고, 백그라운드 갱신에서만 호출할 것.
 */
import { fetchSaleTransactions, fetchLeaseTransactions, aggregateByComplex, getRecentMonths } from './rebTransactions.js';
import { DISTRICT_CODES, type Transaction } from '../types.js';
import { cache, TTL, txCacheKey } from './cache.js';

export interface DashboardData {
  districtSummary: Array<{ district: string; count: number; avgPrice: number; maxPrice: number; minPrice: number }>;
  topComplexes: Array<{
    complexName: string; neighborhood: string; district: string;
    avgPrice: number; minPrice: number; maxPrice: number;
    transactionCount: number; recentTransactions: Transaction[];
  }>;
  nationalStats: {
    totalCount: number; avgPrice: number; maxPrice: number;
    topDistrict: { district: string; count: number } | null;
  };
  recentTx: Record<string, Transaction[]>;
}

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

export async function computeDashboardData(): Promise<DashboardData> {
  const [currentMonth, prevMonth] = getRecentMonths(2);
  const seoulEntries = Object.entries(DISTRICT_CODES).filter(([name]) => name.startsWith('서울 '));

  // ── STEP 1: 서울 25개 구 × 최근 2달 실거래 병렬 수집 ─────────
  const seoulTxMap = new Map<string, Transaction[]>();

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
      seoulTxMap.set(code, curTxs.length > 0 ? curTxs : prevTxs);
    }),
  );

  // ── STEP 2: 서울 구별 요약 집계 ──────────────────────────────
  const districtSummary = seoulEntries.map(([districtName, code]) =>
    calcDistrictSummary(seoulTxMap.get(code) ?? [], districtName),
  );

  // ── STEP 3: 서울 최고가 단지 TOP 4 ───────────────────────────
  const allSeoulComplexes: DashboardData['topComplexes'] = [];

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
  let nationalStats = cache.get<DashboardData['nationalStats']>(nationalCacheKey);

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
      const months = getRecentMonths(2);

      let saleTxs = seoulTxMap.get(code) ?? [];
      if (saleTxs.length < 4) {
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
        saleTxs = txArrays.flat();
      }

      const leaseArrays = await Promise.all(
        months.map(async ym => {
          const key = txCacheKey(code, ym, 'lease');
          const cached = cache.get<Transaction[]>(key);
          if (cached) return cached;
          const fetched = await fetchLeaseTransactions(code, ym);
          if (fetched.length > 0) cache.set(key, fetched, TTL.TRANSACTION);
          return fetched;
        }),
      );
      const leaseTxs = leaseArrays.flat();

      saleTxs.sort((a, b) => b.dealDate.localeCompare(a.dealDate));
      leaseTxs.sort((a, b) => b.dealDate.localeCompare(a.dealDate));

      recentTx[districtName] = [
        ...saleTxs.slice(0, 4),
        ...leaseTxs.slice(0, 4),
      ];
    }),
  );

  return { districtSummary, topComplexes, nationalStats, recentTx };
}
