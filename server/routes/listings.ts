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
import { cache, TTL } from '../services/cache.js';

const router = Router();

/**
 * GET /api/listings/deviation
 * 특정 매물의 실거래가 대비 괴리율 계산
 *
 * Query params:
 *   district      - 지역명
 *   complex       - 단지명
 *   area          - 면적(㎡)
 *   listingPrice  - 현재 호가(만원)
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
    const cacheKey = `tx:${code}:${months.join('-')}:sale`;
    let txs = cache.get<Awaited<ReturnType<typeof fetchSaleTransactions>>>(cacheKey);

    if (!txs) {
      // 최근 6개월 실거래가 병렬 수집
      const results = await Promise.allSettled(
        months.map(ym => fetchSaleTransactions(code, ym)),
      );
      txs = results
        .filter((r): r is PromiseFulfilledResult<typeof txs & NonNullable<unknown>> => r.status === 'fulfilled')
        .flatMap(r => r.value ?? []);
      cache.set(cacheKey, txs, TTL.TRANSACTION);
    }

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
 */
router.get('/district-summary', async (req: Request, res: Response) => {
  try {
    const districts = Object.keys(DISTRICT_CODES);
    const recentMonths = getRecentMonths(1); // 직전 달

    const summaries = await Promise.allSettled(
      districts.map(async district => {
        const code = DISTRICT_CODES[district];
        const cacheKey = `summary:${code}:${recentMonths[0]}`;
        let txs = cache.get<Awaited<ReturnType<typeof fetchSaleTransactions>>>(cacheKey);

        if (!txs) {
          txs = await fetchSaleTransactions(code, recentMonths[0]);
          cache.set(cacheKey, txs, TTL.DISTRICT);
        }

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
      .filter((r): r is PromiseFulfilledResult<typeof summaries[0] extends PromiseFulfilledResult<infer T> ? T : never> => r.status === 'fulfilled')
      .map(r => r.value);

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/listings/district-summary]', err);
    return res.status(500).json({ success: false, error: '지역 요약 조회 실패' });
  }
});

export default router;
