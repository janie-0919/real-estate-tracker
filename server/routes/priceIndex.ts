/**
 * /api/price-index 라우터
 * 한국부동산원(R-ONE) 부동산통계정보 API 연동
 *
 * 엔드포인트:
 *   GET /api/price-index/tables          - 통계표 목록 (STATBL_ID 확인용)
 *   GET /api/price-index                 - 가격지수 데이터 조회
 *   GET /api/price-index/monthly         - 월간 가격지수 시계열
 */

import { Router, type Request, type Response } from 'express';
import {
  fetchTableList,
  fetchPriceIndex,
  fetchMonthlyPriceIndex,
  isUsingDefaultKey,
} from '../services/reb.js';
import { cache, TTL } from '../services/cache.js';

const router = Router();

// ── 통계표 목록 ──────────────────────────────────────────────────

/**
 * GET /api/price-index/tables
 * 사용 가능한 통계표 목록을 반환합니다.
 * STATBL_ID를 모를 때 여기서 확인하세요.
 *
 * Response:
 *   { success: true, usingDefaultKey: boolean, data: RebTableRow[] }
 */
router.get('/tables', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'reb:tables';
    let tables = cache.get<Awaited<ReturnType<typeof fetchTableList>>>(cacheKey);
    if (!tables) {
      tables = await fetchTableList();
      cache.set(cacheKey, tables, TTL.DISTRICT); // 24시간 캐시
    }

    return res.json({
      success: true,
      usingDefaultKey: isUsingDefaultKey(),
      data: tables,
      meta: { count: tables.length },
    });
  } catch (err) {
    console.error('[/api/price-index/tables]', err);
    return res.status(500).json({
      success: false,
      error: 'R-ONE 통계표 목록 조회 실패. REB_API_KEY를 확인하세요.',
    });
  }
});

// ── 가격지수 원본 데이터 ─────────────────────────────────────────

/**
 * GET /api/price-index
 *
 * Query params:
 *   statblId    (필수) 통계표 ID  예: A_2024_00240
 *   cycle       데이터 주기: MM(월·기본값) | WK(주) | YY(연)
 *   fromPeriod  조회 시작 시점: 월=YYYYMM, 주=YYYYWW, 연=YYYY  예: 202301
 *   pageSize    페이지당 건수 (기본 1000)
 *
 * Response:
 *   { success: true, data: RebDataRow[] }
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      statblId,
      cycle = 'MM',
      fromPeriod,
      pageSize = '1000',
    } = req.query as Record<string, string>;

    if (!statblId) {
      return res.status(400).json({
        success: false,
        error: 'statblId 파라미터가 필요합니다. /api/price-index/tables 에서 STATBL_ID를 확인하세요.',
      });
    }

    const cacheKey = `reb:data:${statblId}:${cycle}:${fromPeriod ?? 'latest'}`;
    let rows = cache.get<Awaited<ReturnType<typeof fetchPriceIndex>>>(cacheKey);
    if (!rows) {
      rows = await fetchPriceIndex({
        statblId,
        cycle: cycle as 'MM' | 'WK' | 'YY',
        fromPeriod,
        pageSize: parseInt(pageSize, 10),
      });
      cache.set(cacheKey, rows, TTL.DISTRICT);
    }

    return res.json({
      success: true,
      usingDefaultKey: isUsingDefaultKey(),
      data: rows,
      meta: { statblId, cycle, fromPeriod, count: rows.length },
    });
  } catch (err) {
    console.error('[/api/price-index]', err);
    return res.status(500).json({
      success: false,
      error: '가격지수 조회 실패. statblId와 REB_API_KEY를 확인하세요.',
    });
  }
});

// ── 월간 시계열 (프론트엔드 차트용) ─────────────────────────────

/**
 * GET /api/price-index/monthly
 *
 * Query params:
 *   statblId    (필수) 통계표 ID
 *   fromPeriod  (필수) 조회 시작 연월  예: 202301
 *   regions     쉼표 구분 지역명 필터  예: 전국,서울,강남구
 *               (생략 시 전체 지역 반환)
 *
 * Response:
 *   { success: true, data: PriceIndexPoint[] }
 *
 * @example
 *   GET /api/price-index/monthly?statblId=A_2024_00240&fromPeriod=202501&regions=전국,서울
 */
router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const { statblId, fromPeriod, regions } = req.query as Record<string, string>;

    if (!statblId || !fromPeriod) {
      return res.status(400).json({
        success: false,
        error: 'statblId와 fromPeriod 파라미터가 필요합니다.',
      });
    }

    const regionList = regions ? regions.split(',').map(r => r.trim()) : undefined;
    const cacheKey = `reb:monthly:${statblId}:${fromPeriod}:${regions ?? 'all'}`;

    let data = cache.get<Awaited<ReturnType<typeof fetchMonthlyPriceIndex>>>(cacheKey);
    if (!data) {
      data = await fetchMonthlyPriceIndex(statblId, fromPeriod, regionList);
      cache.set(cacheKey, data, TTL.DISTRICT);
    }

    return res.json({
      success: true,
      usingDefaultKey: isUsingDefaultKey(),
      data,
      meta: {
        statblId,
        fromPeriod,
        regions: regionList ?? '전체',
        count: data.length,
      },
    });
  } catch (err) {
    console.error('[/api/price-index/monthly]', err);
    return res.status(500).json({
      success: false,
      error: '월간 가격지수 조회 실패.',
    });
  }
});

export default router;
