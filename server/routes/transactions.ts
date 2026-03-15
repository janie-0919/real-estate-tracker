import { Router, type Request, type Response } from 'express';
import { fetchSaleTransactions, fetchLeaseTransactions, fetchTransactionRange, aggregateByComplex, getRecentMonths } from '../services/molit.js';
import { DISTRICT_CODES } from '../types.js';
import { cache, TTL } from '../services/cache.js';

const router = Router();

/**
 * GET /api/transactions
 * 실거래가 조회
 *
 * Query params:
 *   district   - 지역명 (예: "서울 서초구") or districtCode (예: "11650")
 *   yearMonth  - 조회 연월 (예: "202401"), 없으면 최근 3개월
 *   dealType   - "sale" | "lease" | "all" (기본: "all")
 *   complex    - 단지명 필터 (선택)
 *   area       - 면적 필터 (선택, ±10㎡ 범위)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { district, districtCode, yearMonth, dealType = 'all', complex, area } = req.query as Record<string, string>;

    // 지역 코드 확인
    const code = districtCode ?? DISTRICT_CODES[district];
    if (!code) {
      return res.status(400).json({
        success: false,
        error: `알 수 없는 지역입니다: ${district}. 지원 지역: ${Object.keys(DISTRICT_CODES).join(', ')}`,
      });
    }

    // 조회 개월 목록 구성
    const months = yearMonth ? [yearMonth] : getRecentMonths(3);
    const cacheKey = `tx:${code}:${months.join('-')}:${dealType}`;

    // 캐시 확인
    let transactions = cache.get<Awaited<ReturnType<typeof fetchTransactionRange>>>(cacheKey);
    if (!transactions) {
      transactions = await fetchTransactionRange(code, months, dealType as 'sale' | 'lease' | 'all');
      cache.set(cacheKey, transactions, TTL.TRANSACTION);
    }

    // 단지명 필터
    if (complex) {
      transactions = transactions.filter(t =>
        t.complexName.includes(complex)
      );
    }

    // 면적 필터
    if (area) {
      const areaNum = parseFloat(area);
      transactions = transactions.filter(t =>
        Math.abs(t.area - areaNum) <= 10
      );
    }

    // 날짜 내림차순 정렬
    transactions.sort((a, b) => b.dealDate.localeCompare(a.dealDate));

    return res.json({
      success: true,
      data: transactions,
      meta: {
        totalCount: transactions.length,
        districtCode: code,
        months,
      },
    });
  } catch (err) {
    console.error('[/api/transactions]', err);
    return res.status(500).json({
      success: false,
      error: '실거래가 조회에 실패했습니다. API 키를 확인해주세요.',
    });
  }
});

/**
 * GET /api/transactions/complex-stats
 * 단지별 실거래 통계
 *
 * Query params:
 *   district  - 지역명
 *   months    - 조회 개월수 (기본 3)
 *   minCount  - 최소 거래 건수 (기본 1)
 */
router.get('/complex-stats', async (req: Request, res: Response) => {
  try {
    const { district, districtCode, months = '3', minCount = '1' } = req.query as Record<string, string>;

    const code = districtCode ?? DISTRICT_CODES[district];
    if (!code) {
      return res.status(400).json({ success: false, error: '지역 코드가 없습니다.' });
    }

    const monthList = getRecentMonths(parseInt(months, 10));
    const cacheKey = `complex-stats:${code}:${monthList.join('-')}`;

    let stats = cache.get<ReturnType<typeof aggregateByComplex>>(cacheKey);
    if (!stats) {
      const txs = await fetchTransactionRange(code, monthList, 'sale');
      stats = aggregateByComplex(txs);
      cache.set(cacheKey, stats, TTL.DISTRICT);
    }

    const minCountNum = parseInt(minCount, 10);
    const result = Array.from(stats.values())
      .filter(s => s.transactions.length >= minCountNum)
      .sort((a, b) => b.transactions.length - a.transactions.length)
      .map(s => ({
        complexName: s.complexName,
        neighborhood: s.neighborhood,
        avgPrice: s.avgPrice,
        minPrice: s.minPrice,
        maxPrice: s.maxPrice,
        transactionCount: s.transactions.length,
        recentTransactions: s.transactions.slice(0, 5),
      }));

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[/api/transactions/complex-stats]', err);
    return res.status(500).json({ success: false, error: '통계 조회 실패' });
  }
});

/**
 * GET /api/transactions/price-trend
 * 지역 월별 평균 가격 추이
 */
router.get('/price-trend', async (req: Request, res: Response) => {
  try {
    const { district, districtCode, months = '6' } = req.query as Record<string, string>;
    const code = districtCode ?? DISTRICT_CODES[district];
    if (!code) return res.status(400).json({ success: false, error: '지역 코드가 없습니다.' });

    const monthList = getRecentMonths(parseInt(months, 10));
    const results: { yearMonth: string; avgPrice: number; count: number }[] = [];

    for (const ym of monthList) {
      const cacheKey = `tx:${code}:${ym}:sale`;
      let txs = cache.get<Awaited<ReturnType<typeof fetchSaleTransactions>>>(cacheKey);
      if (!txs) {
        txs = await fetchSaleTransactions(code, ym);
        cache.set(cacheKey, txs, TTL.TRANSACTION);
      }
      if (txs.length > 0) {
        const avg = Math.round(txs.reduce((s, t) => s + t.price, 0) / txs.length);
        results.push({ yearMonth: ym, avgPrice: avg, count: txs.length });
      }
    }

    return res.json({ success: true, data: results.reverse() });
  } catch (err) {
    console.error('[/api/transactions/price-trend]', err);
    return res.status(500).json({ success: false, error: '추이 조회 실패' });
  }
});

export default router;
