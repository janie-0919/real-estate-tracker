import { Router, type Request, type Response } from 'express';
import { fetchSaleTransactions, fetchTransactionRange, aggregateByComplex, getRecentMonths } from '../services/rebTransactions.js';
import { DISTRICT_CODES, type Transaction } from '../types.js';
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

    // 조회 개월 목록 구성 (최신 데이터 반영을 위해 6개월로 확장)
    const months = yearMonth ? [yearMonth] : getRecentMonths(6);
    const cacheKey = `tx:${code}:${months.join('-')}:${dealType}`;

    // 캐시 확인 (빈 결과는 캐시하지 않음 — API 데이터 공개 시차 대응)
    let transactions = cache.get<Awaited<ReturnType<typeof fetchTransactionRange>>>(cacheKey);
    if (!transactions) {
      transactions = await fetchTransactionRange(code, months, dealType as 'sale' | 'lease' | 'all');
      if (transactions.length > 0) {
        cache.set(cacheKey, transactions, TTL.TRANSACTION);
      }
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
      if (stats.size > 0) {
        cache.set(cacheKey, stats, TTL.DISTRICT);
      }
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
 * GET /api/transactions/top-complexes
 * 최고가 단지 TOP N
 *
 * Query params:
 *   months - 조회 개월수 (기본 1)
 *   limit  - 반환 단지 수 (기본 4)
 *   sido   - 시/도 필터 (예: '서울') — 미지정 시 전국
 */
router.get('/top-complexes', async (req: Request, res: Response) => {
  try {
    const { months = '1', limit = '4', sido } = req.query as Record<string, string>;
    const monthList = getRecentMonths(parseInt(months, 10));
    const limitNum = parseInt(limit, 10);

    const cacheKey = `top-complexes:${sido ?? 'all'}:${monthList.join('-')}:${limitNum}`;
    const cached = cache.get<unknown[]>(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    // sido 필터 적용 (미지정 시 전국)
    const districtEntries = sido
      ? Object.entries(DISTRICT_CODES).filter(([name]) => name.startsWith(sido + ' '))
      : Object.entries(DISTRICT_CODES);
    const results = await Promise.allSettled(
      districtEntries.map(async ([districtName, code]) => {
        const txs = await fetchTransactionRange(code, monthList, 'sale');
        const stats = aggregateByComplex(txs);
        return Array.from(stats.values()).map(s => ({
          complexName: s.complexName,
          neighborhood: s.neighborhood,
          district: districtName,
          avgPrice: s.avgPrice,
          minPrice: s.minPrice,
          maxPrice: s.maxPrice,
          transactionCount: s.transactions.length,
          recentTransactions: s.transactions.slice(0, 3),
        }));
      })
    );

    type ComplexEntry = {
      complexName: string; neighborhood: string; district: string;
      avgPrice: number; minPrice: number; maxPrice: number;
      transactionCount: number; recentTransactions: Transaction[];
    };
    const allComplexes = (results
      .filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<ComplexEntry[]>[])
      .flatMap(r => r.value);

    const top = allComplexes
      .sort((a, b) => b.maxPrice - a.maxPrice)
      .slice(0, limitNum);

    if (top.length > 0) {
      cache.set(cacheKey, top, TTL.DISTRICT);
    }

    return res.json({ success: true, data: top });
  } catch (err) {
    console.error('[/api/transactions/top-complexes]', err);
    return res.status(500).json({ success: false, error: '최고가 단지 조회 실패' });
  }
});

/**
 * GET /api/transactions/national-stats
 * 전국 실거래 요약 통계 (이번 달 기준)
 * 캐시된 데이터를 재사용하므로 top-complexes 후 빠름
 */
router.get('/national-stats', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'national-stats:latest';
    const cached = cache.get<unknown>(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const monthList = getRecentMonths(1);
    const districtEntries = Object.entries(DISTRICT_CODES);

    const results = await Promise.allSettled(
      districtEntries.map(async ([districtName, code]) => {
        const txCacheKey = `tx:${code}:${monthList.join('-')}:sale`;
        let txs = cache.get<Awaited<ReturnType<typeof fetchTransactionRange>>>(txCacheKey);
        if (!txs) {
          txs = await fetchTransactionRange(code, monthList, 'sale');
          if (txs.length > 0) cache.set(txCacheKey, txs, TTL.TRANSACTION);
        }
        return { district: districtName, count: txs.length, prices: txs.map(t => t.price) };
      }),
    );

    const byDistrict = results
      .filter((r): r is PromiseFulfilledResult<{ district: string; count: number; prices: number[] }> => r.status === 'fulfilled')
      .map(r => r.value);

    const totalCount = byDistrict.reduce((s, d) => s + d.count, 0);
    const allPrices = byDistrict.flatMap(d => d.prices);
    const avgPrice = allPrices.length ? Math.round(allPrices.reduce((s, p) => s + p, 0) / allPrices.length) : 0;
    const maxPrice = allPrices.length ? Math.max(...allPrices) : 0;
    const topByVolume = byDistrict.filter(d => d.count > 0).sort((a, b) => b.count - a.count)[0] ?? null;

    const data = {
      totalCount,
      avgPrice,
      maxPrice,
      topDistrict: topByVolume ? { district: topByVolume.district, count: topByVolume.count } : null,
    };

    if (totalCount > 0) cache.set(cacheKey, data, TTL.DISTRICT);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/transactions/national-stats]', err);
    return res.status(500).json({ success: false, error: '전국 통계 조회 실패' });
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
