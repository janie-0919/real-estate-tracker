/**
 * 매물 호가 라우터
 *
 * 실거래 데이터(공공API) + 괴리율 계산을 결합해서 제공.
 * 실제 매물 데이터는 직방 등 외부 소스 또는 자체 수집 파이프라인과 연결.
 */
import { Router, type Request, type Response } from 'express';
import { fetchSaleTransactions, getRecentMonths } from '../services/rebTransactions.js';
import { calcDeviation } from '../services/listings.js';
import { DISTRICT_CODES } from '../types.js';
import { cache, TTL, txCacheKey } from '../services/cache.js';

const router = Router();

/**
 * GET /api/listings/deviation
 * 특정 매물의 실거래가 대비 괴리율 계산
 */
router.get('/deviation', async (req: Request, res: Response) => {
  try {
    const {
      district,
      districtCode,
      complex,
      area,
      listingPrice,
    } = req.query as Record<string, string>;

    if (!listingPrice || !area) {
      return res.status(400).json({ success: false, error: 'area, listingPrice 필수' });
    }

    const code = districtCode ?? DISTRICT_CODES[district];
    if (!code) return res.status(400).json({ success: false, error: '지역 코드가 없습니다.' });

    const months = getRecentMonths(6);

    // 월별 캐시를 먼저 확인하고, 없는 달만 fetch (공유 캐시 활용)
    const txArrays = await Promise.all(
      months.map(async ym => {
        const key = txCacheKey(code, ym, 'sale');
        let txs = cache.get<Awaited<ReturnType<typeof fetchSaleTransactions>>>(key);
        if (!txs) {
          txs = await fetchSaleTransactions(code, ym);
          if (txs.length > 0) cache.set(key, txs, TTL.TRANSACTION);
        }
        return txs ?? [];
      }),
    );
    const txs = txArrays.flat();

    // 단지 필터
    const filtered = complex
      ? txs.filter(t => t.complexName.includes(complex))
      : txs;

    const deviation = calcDeviation(
      parseInt(listingPrice, 10),
      filtered,
      parseFloat(area),
    );

    return res.json({ success: true, data: deviation });
  } catch (err) {
    console.error('[/api/listings/deviation]', err);
    return res.status(500).json({ success: false, error: '괴리율 계산 실패' });
  }
});

/**
 * GET /api/listings/district-summary
 * 지역별 최근 실거래 요약 (대시보드 통계용)
 *
 * ✅ 최적화:
 *   - 캐시 키를 tx:{code}:{ym}:sale 형식으로 통일 → top-complexes / national-stats 와 캐시 공유
 *   - 이번 달 + 전달을 동시에(병렬) fetch → 순차 fallback 제거
 *   - 결과 단위 캐시: 전체 summary 결과도 캐시해 재방문 시 즉시 반환
 */
router.get('/district-summary', async (req: Request, res: Response) => {
  try {
    const { sido } = req.query as Record<string, string>;
    const prefix = sido ? (sido + ' ') : '서울 ';
    const districts = Object.keys(DISTRICT_CODES).filter(d => d.startsWith(prefix));

    // 전체 결과 캐시 확인 (두 번째 요청부터는 즉시 반환)
    const summaryCacheKey = `district-summary:${prefix.trim()}`;
    const cachedSummary = cache.get<unknown[]>(summaryCacheKey);
    if (cachedSummary) {
      return res.json({ success: true, data: cachedSummary });
    }

    const [currentMonth, prevMonth] = getRecentMonths(2);

    const summaries = await Promise.allSettled(
      districts.map(async district => {
        const code = DISTRICT_CODES[district];

        // 이번 달 + 전달을 동시에 fetch (공유 캐시 활용 → 다른 엔드포인트가 먼저 불렀으면 캐시 히트)
        const [curTxs, prevTxs] = await Promise.all([
          (async () => {
            const key = txCacheKey(code, currentMonth, 'sale');
            let txs = cache.get<Awaited<ReturnType<typeof fetchSaleTransactions>>>(key);
            if (!txs) {
              txs = await fetchSaleTransactions(code, currentMonth);
              if (txs.length > 0) cache.set(key, txs, TTL.DISTRICT);
            }
            return txs ?? [];
          })(),
          (async () => {
            const key = txCacheKey(code, prevMonth, 'sale');
            let txs = cache.get<Awaited<ReturnType<typeof fetchSaleTransactions>>>(key);
            if (!txs) {
              txs = await fetchSaleTransactions(code, prevMonth);
              if (txs.length > 0) cache.set(key, txs, TTL.DISTRICT);
            }
            return txs ?? [];
          })(),
        ]);

        // 이번 달 우선, 없으면 전달 사용
        const txs = curTxs.length > 0 ? curTxs : prevTxs;

        if (txs.length === 0) {
          return { district, count: 0, avgPrice: 0, maxPrice: 0, minPrice: 0 };
        }

        const prices = txs.map(t => t.price);
        return {
          district,
          count: txs.length,
          avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
          maxPrice: Math.max(...prices),
          minPrice: Math.min(...prices),
        };
      }),
    );

    const data = summaries
      .filter((r): r is PromiseFulfilledResult<{ district: string; count: number; avgPrice: number; maxPrice: number; minPrice: number }> => r.status === 'fulfilled')
      .map(r => r.value);

    // 전체 결과도 캐시 (TTL: 24시간)
    if (data.length > 0) cache.set(summaryCacheKey, data, TTL.DISTRICT);

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/listings/district-summary]', err);
    return res.status(500).json({ success: false, error: '지역 요약 조회 실패' });
  }
});

export default router;
