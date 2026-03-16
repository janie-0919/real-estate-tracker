/**
 * /api/reb/market 라우터
 * 한국부동산원(R-ONE) 아파트 가격 통계를 이용한 지역별 시세 현황
 *
 * 엔드포인트:
 *   GET /api/reb/market?region=강남구&months=6
 *     - R-ONE 통계표 목록에서 아파트 관련 테이블을 자동 탐색
 *     - 요청 지역의 최근 N개월 데이터 반환
 *
 *   GET /api/reb/market/overview?months=3
 *     - 서울 전체 지역별 최신 시세 개요 반환
 */

import { Router, type Request, type Response } from 'express';
import { fetchTableList, fetchPriceIndex, type RebTableRow } from '../services/reb.js';
import { cache, TTL } from '../services/cache.js';

const router = Router();

// 아파트 매매 관련 테이블 탐색 키워드
const APT_SALE_KEYWORDS = ['아파트', '매매'];
const APT_LEASE_KEYWORDS = ['아파트', '전세'];
const EXCLUDE_KEYWORDS = ['분양', '재건축', '규모별', '소득'];

function isAptTable(row: RebTableRow, keywords: string[]): boolean {
  const nm = row.STATBL_NM;
  if (EXCLUDE_KEYWORDS.some(k => nm.includes(k))) return false;
  return keywords.every(k => nm.includes(k)) && row.STTS_CYCLE === 'MM';
}

function getFromPeriod(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface RebMarketPoint {
  period: string;
  value: number;
}

export interface RebMarketStat {
  statblId: string;
  statblNm: string;
  region: string;
  unit: string;
  dataPoints: RebMarketPoint[];
  latestPeriod: string;
  latestValue: number;
  prevPeriod: string | null;
  prevValue: number | null;
  changeRate: number | null;
}

async function fetchMarketStats(
  region: string,
  dealType: 'sale' | 'lease' | 'all',
  months: number,
): Promise<RebMarketStat[]> {
  // 통계표 목록 (캐시 활용)
  const tablesCacheKey = 'reb:tables';
  let allTables = cache.get<RebTableRow[]>(tablesCacheKey);
  if (!allTables) {
    allTables = await fetchTableList();
    cache.set(tablesCacheKey, allTables, TTL.DISTRICT);
  }

  // 관련 테이블 필터링
  const targetTables: RebTableRow[] = [];
  if (dealType === 'sale' || dealType === 'all') {
    targetTables.push(...allTables.filter(t => isAptTable(t, APT_SALE_KEYWORDS)));
  }
  if (dealType === 'lease' || dealType === 'all') {
    targetTables.push(...allTables.filter(t => isAptTable(t, APT_LEASE_KEYWORDS)));
  }

  if (targetTables.length === 0) return [];

  const fromPeriod = getFromPeriod(months);
  const results: RebMarketStat[] = [];

  await Promise.allSettled(
    targetTables.map(async table => {
      const dataCacheKey = `reb:market:${table.STATBL_ID}:${fromPeriod}`;
      let rows = cache.get<Awaited<ReturnType<typeof fetchPriceIndex>>>(dataCacheKey);
      if (!rows) {
        rows = await fetchPriceIndex({ statblId: table.STATBL_ID, cycle: 'MM', fromPeriod });
        cache.set(dataCacheKey, rows, TTL.DISTRICT);
      }

      // 요청 지역에 해당하는 rows만 필터 (ITM_NM이 region을 포함)
      const regionRows = rows.filter(
        r => r.ITM_NM.includes(region) && r.DTA_VAL && r.DTA_VAL.trim() !== '',
      );
      if (regionRows.length === 0) return;

      // 매칭된 지역명 추출 (가장 짧은 것 = 가장 정확한 매칭)
      const matchedRegion = regionRows
        .map(r => r.ITM_NM)
        .sort((a, b) => a.length - b.length)[0];

      const regionSpecific = regionRows.filter(r => r.ITM_NM === matchedRegion);

      // 기간별로 집계 (중복 제거 후 최신값 사용)
      const periodMap = new Map<string, number>();
      for (const r of regionSpecific) {
        const val = parseFloat(r.DTA_VAL);
        if (!isNaN(val)) periodMap.set(r.WRTTIME_IDTFR_ID, val);
      }

      const dataPoints: RebMarketPoint[] = Array.from(periodMap.entries())
        .map(([period, value]) => ({ period, value }))
        .sort((a, b) => a.period.localeCompare(b.period));

      if (dataPoints.length === 0) return;

      const latest = dataPoints[dataPoints.length - 1];
      const prev = dataPoints.length >= 2 ? dataPoints[dataPoints.length - 2] : null;
      const changeRate = prev
        ? parseFloat((((latest.value - prev.value) / prev.value) * 100).toFixed(2))
        : null;

      const unit = regionSpecific[0].UNIT_NM ?? '';

      results.push({
        statblId: table.STATBL_ID,
        statblNm: table.STATBL_NM,
        region: matchedRegion,
        unit,
        dataPoints,
        latestPeriod: latest.period,
        latestValue: latest.value,
        prevPeriod: prev?.period ?? null,
        prevValue: prev?.value ?? null,
        changeRate,
      });
    }),
  );

  return results;
}

/**
 * GET /api/reb/market
 * 특정 지역 아파트 가격 시계열
 *
 * Query:
 *   region   - 지역명 (예: 강남구, 서울)
 *   dealType - sale | lease | all (기본 all)
 *   months   - 조회 개월 수 (기본 6)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { region, dealType = 'all', months = '6' } = req.query as Record<string, string>;

    if (!region) {
      return res.status(400).json({ success: false, error: 'region 파라미터가 필요합니다.' });
    }

    const cacheKey = `reb:market:result:${region}:${dealType}:${months}`;
    let data = cache.get<RebMarketStat[]>(cacheKey);
    if (!data) {
      data = await fetchMarketStats(region, dealType as 'sale' | 'lease' | 'all', parseInt(months, 10));
      cache.set(cacheKey, data, TTL.DISTRICT);
    }

    return res.json({
      success: true,
      data,
      meta: { region, dealType, months: parseInt(months, 10), count: data.length },
    });
  } catch (err) {
    console.error('[/api/reb/market]', err);
    return res.status(500).json({ success: false, error: 'R-ONE 시세 조회 실패' });
  }
});

/**
 * GET /api/reb/market/overview
 * 서울 전체 구별 최신 아파트 가격 지수 개요
 *
 * Query:
 *   months - 조회 개월 수 (기본 3)
 */
const SEOUL_GU_NAMES = [
  '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구',
  '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구',
  '구로구', '금천구', '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구',
];

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { months = '3' } = req.query as Record<string, string>;

    const cacheKey = `reb:market:overview:${months}`;
    let data = cache.get<{ district: string; stats: RebMarketStat[] }[]>(cacheKey);

    if (!data) {
      const results = await Promise.allSettled(
        SEOUL_GU_NAMES.map(async gu => {
          const stats = await fetchMarketStats(gu, 'sale', parseInt(months, 10));
          return { district: `서울 ${gu}`, stats };
        }),
      );
      data = results
        .filter((r): r is PromiseFulfilledResult<{ district: string; stats: RebMarketStat[] }> =>
          r.status === 'fulfilled' && r.value.stats.length > 0,
        )
        .map(r => r.value);
      cache.set(cacheKey, data, TTL.DISTRICT);
    }

    return res.json({ success: true, data, meta: { count: data.length } });
  } catch (err) {
    console.error('[/api/reb/market/overview]', err);
    return res.status(500).json({ success: false, error: 'R-ONE 개요 조회 실패' });
  }
});

export default router;
