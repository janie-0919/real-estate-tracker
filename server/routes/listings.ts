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
 *
 * 이번 달 데이터가 없으면 전달로 자동 fallback
 * (국토부 실거래 신고는 30일 이내 → 이번 달 초는 데이터 부족)
 */
router.get('/district-summary', async (req: Request, res: Response) => {
  try {
    const { sido } = req.query as Record<string, string>;
    // sido 미지정 시 서울만 조회 (전국 250개 조회는 /transactions/national-stats 사용)
    const allDistricts = Object.keys(DISTRICT_CODES);
    const prefix = sido ? (sido + ' ') : '서울 ';
    const districts = allDistricts.filter(d => d.startsWith(prefix));
    // 이번 달 + 전달: 이번 달 데이터 부족 시 전달로 fallback
    const [currentMonth, prevMonth] = getRecentMonths(2);

    const summaries = await Promise.allSettled(
      districts.map(async district => {
        const code = DISTRICT_CODES[district];

        // 이번 달 조회 (캐시 우선)
        const curKey = `summary:${code}:${currentMonth}`;
        let txs = cache.get<Awaited<ReturnType<typeof fetchSaleTransactions>>>(curKey);
        if (!txs) {
          txs = await fetchSaleTransactions(code, currentMonth);
          if (txs.length > 0) cache.set(curKey, txs, TTL.DISTRICT); // 결과 있을 때만 캐시
        }

        // 이번 달 데이터 없으면 전달로 fallback
        if (txs.length === 0) {
          const prevKey = `summary:${code}:${prevMonth}`;
          let prevTxs = cache.get<Awaited<ReturnType<typeof fetchSaleTransactions>>>(prevKey);
          if (!prevTxs) {
            prevTxs = await fetchSaleTransactions(code, prevMonth);
            if (prevTxs.length > 0) cache.set(prevKey, prevTxs, TTL.DISTRICT);
          }
          txs = prevTxs;
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
