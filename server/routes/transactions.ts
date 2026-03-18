import { Router, type Request, type Response } from 'express';
import { fetchSaleTransactions, fetchTransactionRange, aggregateByComplex, getRecentMonths } from '../services/rebTransactions.js';
import { DISTRICT_CODES, type Transaction } from '../types.js';
import { cache, TTL, txCacheKey, txRangeCacheKey } from '../services/cache.js';

const router = Router();

/**
 * GET /api/transactions
 * 실거래가 조회
 *
 * ✅ 최적화: 월별 캐시 키(txCacheKey)를 사용해 다른 엔드포인트와 캐시 공유
 *
 * Query params:
 *   district   - 지역명 (예: "서울 서초구") or districtCode (예: "11650")
 *   yearMonth  - 조회 연월 (예: "202401"), 없으면 최근 6개월
 *   dealType   - "sale" | "lease" | "all" (기본: "all")
 *   complex    - 단지명 필터 (선택)
 *   area       - 면적 필터 (선택, ±10㎡ 범위)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { district, districtCode, yearMonth, dealType = 'all', complex, area } = req.query as Record<string, string>;

    const code = districtCode ?? DISTRICT_CODES[district];
    if (!code) {
      return res.status(400).json({
        success: false,
        error: `알 수 없는 지역입니다: ${district}. 지원 지역: ${Object.keys(DISTRICT_CODES).join(', ')}`,
      });
    }

    const months = yearMonth ? [yearMonth] : getRecentMonths(6);
    const fetchType = dealType === 'monthly' ? 'lease' : dealType as 'sale' | 'lease' | 'all';

    let transactions: Transaction[];

    if (months.length === 1) {
      // 단일 달
    }
      if (months.length === 1) {
        const key = txCacheKey(code, months[0], fetchType);
        let txs = cache.get<Transaction[]>(key);
        if (!txs) {
          txs = await fetchTransactionRange(code, months, fetchType);
        if (txs.length > 0) cache.set(key, txs, TTL.TRANSACTION);
      }
      transactions = txs ?? [];
    } else {
      // 여러 달
      const rangeKey = txRangeCacheKey(code, months, fetchType);
      const rangeCached = cache.get<Transaction[]>(rangeKey);
      if (rangeCached) {
        transactions = rangeCached;
      } else {
        const txArrays = await Promise.all(
          months.map(async ym => {
            const key = txCacheKey(code, ym, fetchType);
            let txs = cache.get<Transaction[]>(key);
            if (!txs) {
              txs = await fetchTransactionRange(code, [ym], fetchType);
              if (txs.length > 0) cache.set(key, txs, TTL.TRANSACTION);
            }
            return txs ?? [];
          }),
        );
        transactions = txArrays.flat();
        if (transactions.length > 0) cache.set(rangeKey, transactions, TTL.TRANSACTION);
      }
    }

    // monthly 필터
    if (dealType === 'monthly') {
      transactions = transactions.filter(t => t.dealType === 'monthly');
    }

    // 단지명 필터
    if (complex) {
      transactions = transactions.filter(t => t.complexName.includes(complex));
    }

    // 면적 필터
    if (area) {
      const areaNum = parseFloat(area);
      transactions = transactions.filter(t => Math.abs(t.area - areaNum) <= 10);
    }

    // 날짜 내림차순 정렬
    transactions.sort((a, b) => b.dealDate.localeCompare(a.dealDate));

    return res.json({
      success: true,
      data: transactions,
      meta: { totalCount: transactions.length, districtCode: code, months },
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
 * ✅ 최적화: 월별 캐시 키로 공유 캐시 활용
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
      // 월별 캐시 활용
      const txArrays = await Promise.all(
        monthList.map(async ym => {
          const key = txCacheKey(code, ym, 'sale');
          let txs = cache.get<Transaction[]>(key);
          if (!txs) {
            txs = await fetchSaleTransactions(code, ym);
            if (txs.length > 0) cache.set(key, txs, TTL.TRANSACTION);
          }
          return txs ?? [];
        }),
      );
      const allTxs = txArrays.flat();
      stats = aggregateByComplex(allTxs);
      if (stats.size > 0) cache.set(cacheKey, stats, TTL.DISTRICT);
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
 * ✅ 최적화:
 *   - 월별 공유 캐시 활용으로 district-summary / national-stats 와 API 호출 공유
 *   - sido='서울' 시 서울 25개 구만 조회 (불필요한 전국 조회 방지)
 */
router.get('/top-complexes', async (req: Request, res: Response) => {
  try {
    const { months = '1', limit = '4', sido } = req.query as Record<string, string>;
    const monthList = getRecentMonths(parseInt(months, 10));
    const limitNum = parseInt(limit, 10);

    const cacheKey = `top-complexes:${sido ?? 'all'}:${monthList.join('-')}:${limitNum}`;
    const cached = cache.get<unknown[]>(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const districtEntries = sido
      ? Object.entries(DISTRICT_CODES).filter(([name]) => name.startsWith(sido + ' '))
      : Object.entries(DISTRICT_CODES);

    const results = await Promise.allSettled(
      districtEntries.map(async ([districtName, code]) => {
        // ✅ 월별 공유 캐시 활용 (district-summary 에서 이미 불러온 달은 캐시 히트)
        const txArrays = await Promise.all(
          monthList.map(async ym => {
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
      }),
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

    if (top.length > 0) cache.set(cacheKey, top, TTL.DISTRICT);

    return res.json({ success: true, data: top });
  } catch (err) {
    console.error('[/api/transactions/top-complexes]', err);
    return res.status(500).json({ success: false, error: '최고가 단지 조회 실패' });
  }
});

/**
 * GET /api/transactions/national-stats
 * 전국 실거래 요약 통계
 *
 * ✅ 최적화: 월별 공유 캐시 활용으로 top-complexes 완료 후 거의 대부분 캐시 히트
 */
router.get('/national-stats', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'national-stats:latest';
    const cached = cache.get<unknown>(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const monthList = getRecentMonths(2);
    const districtEntries = Object.entries(DISTRICT_CODES);

    const results = await Promise.allSettled(
      districtEntries.map(async ([districtName, code]) => {
        // ✅ 공유 캐시 활용: top-complexes / district-summary 에서 이미 불러온 달은 캐시 히트
        const txArrays = await Promise.all(
          monthList.map(async ym => {
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
 *
 * ✅ 최적화: 공유 캐시 활용
 */
router.get('/price-trend', async (req: Request, res: Response) => {
  try {
    const { district, districtCode, months = '6' } = req.query as Record<string, string>;
    const code = districtCode ?? DISTRICT_CODES[district];
    if (!code) return res.status(400).json({ success: false, error: '지역 코드가 없습니다.' });

    const monthList = getRecentMonths(parseInt(months, 10));
    const results: { yearMonth: string; avgPrice: number; count: number }[] = [];

    await Promise.all(
      monthList.map(async ym => {
        const key = txCacheKey(code, ym, 'sale');
        let txs = cache.get<Transaction[]>(key);
        if (!txs) {
          txs = await fetchSaleTransactions(code, ym);
          if (txs.length > 0) cache.set(key, txs, TTL.TRANSACTION);
        }
        const list = txs ?? [];
        if (list.length > 0) {
          const avg = Math.round(list.reduce((s, t) => s + t.price, 0) / list.length);
          results.push({ yearMonth: ym, avgPrice: avg, count: list.length });
        }
      }),
    );

    results.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('[/api/transactions/price-trend]', err);
    return res.status(500).json({ success: false, error: '추이 조회 실패' });
  }
});

export default router;
