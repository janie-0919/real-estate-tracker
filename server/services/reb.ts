/**
 * 한국부동산원(R-ONE) 부동산통계정보 Open API
 *
 * 공식 엔드포인트:
 *   - 통계표 목록: GET https://www.reb.or.kr/r-one/openapi/SttsApiTbl.do?KEY=...&Type=json
 *   - 통계 데이터: GET https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do?KEY=...&STATBL_ID=...&DTACYCLE_CD=MM&WRTTIME_IDTFR_ID=202301&Type=json
 *
 * 응답 JSON 구조 (실제):
 *   {
 *     "SttsApiTblData": [
 *       { "head": [{ "CODE": "INFO-000", "MESSAGE": "...", "list_total_count": 100 }] },
 *       { "row": [ { STATBL_ID, ITM_NM, WRTTIME_IDTFR_ID, DTA_VAL, ... } ] }
 *     ]
 *   }
 *
 * 인증키 발급: https://www.reb.or.kr/r-one/portal/openapi/openApiListPage.do
 */

import axios from 'axios';

const BASE_URL = 'https://www.reb.or.kr/r-one/openapi';
const API_KEY = process.env.REB_API_KEY ?? 'sample';

// API 키가 'sample'이면 결과가 10건으로 제한됨
export const isUsingDefaultKey = () => API_KEY === 'sample';

// ── 응답 타입 ────────────────────────────────────────────────────

export interface RebTableRow {
  STATBL_ID: string;
  STATBL_NM: string;
  STTS_CYCLE: string;    // MM | WK | YY
  ORG_ID: string;
  ORG_NM: string;
}

export interface RebDataRow {
  STATBL_ID: string;
  ITM_ID: string;
  ITM_NM: string;              // 지역명 (예: 전국, 서울, 강남구)
  WRTTIME_IDTFR_ID: string;   // 기준 시점 (예: 202301)
  DTA_VAL: string;             // 통계값
  UNIT_NM?: string;            // 단위
}

// R-ONE API 실제 응답: 배열 형태 [ {head:[...]}, {row:[...]} ]
type RebSection<T> = Array<
  | { head: Array<{ CODE?: string; MESSAGE?: string; list_total_count?: number }> }
  | { row: T[] }
>;

interface RebApiResponse<T> {
  SttsApiTbl?: RebSection<T>;
  SttsApiTblData?: RebSection<T>;
  RESULT?: { CODE: string; MESSAGE: string };
}

// ── 파싱 헬퍼 ───────────────────────────────────────────────────

function extractRows<T>(sections: RebSection<T> | undefined): T[] {
  if (!Array.isArray(sections)) return [];
  const rowSection = sections.find((s): s is { row: T[] } => 'row' in s);
  return rowSection?.row ?? [];
}

function extractError(sections: RebSection<unknown> | undefined): string | null {
  if (!Array.isArray(sections)) return null;
  const headSection = sections.find((s): s is { head: Array<{ CODE?: string; MESSAGE?: string }> } => 'head' in s);
  const head = headSection?.head?.[0];
  if (head?.CODE && head.CODE !== 'INFO-000') {
    return `R-ONE API 오류: ${head.CODE} - ${head.MESSAGE ?? ''}`;
  }
  return null;
}

// ── 요청 헬퍼 ───────────────────────────────────────────────────

async function rebGet<T>(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<T[]> {
  const url = `${BASE_URL}/${endpoint}`;
  const fullParams = {
    KEY: API_KEY,
    Type: 'json',
    pIndex: 1,
    pSize: 1000,
    ...params,
  };

  console.log(`[REB] ${endpoint}`, { ...fullParams, KEY: fullParams.KEY.slice(0, 8) + '...' });

  const res = await axios.get<RebApiResponse<T>>(url, {
    params: fullParams,
    timeout: 15_000,
  });

  const data = res.data;

  // 최상위 RESULT 오류 처리 (API 키 오류 등)
  if (data.RESULT?.CODE && data.RESULT.CODE !== 'INFO-000') {
    throw new Error(`R-ONE API 오류: ${data.RESULT.CODE} - ${data.RESULT.MESSAGE}`);
  }

  // 통계표 목록 응답 (SttsApiTbl)
  if (data.SttsApiTbl) {
    const err = extractError(data.SttsApiTbl as RebSection<unknown>);
    if (err) throw new Error(err);
    return extractRows<T>(data.SttsApiTbl as RebSection<T>);
  }

  // 통계 데이터 응답 (SttsApiTblData)
  if (data.SttsApiTblData) {
    const err = extractError(data.SttsApiTblData as RebSection<unknown>);
    if (err) throw new Error(err);
    return extractRows<T>(data.SttsApiTblData as RebSection<T>);
  }

  console.warn('[REB] 알 수 없는 응답 구조:', JSON.stringify(data).slice(0, 300));
  return [];
}

// ── 통계표 목록 조회 ─────────────────────────────────────────────

export async function fetchTableList(): Promise<RebTableRow[]> {
  return rebGet<RebTableRow>('SttsApiTbl.do', {});
}

// ── 통계 데이터 조회 ─────────────────────────────────────────────

export interface FetchIndexParams {
  statblId: string;
  cycle?: 'MM' | 'WK' | 'YY';
  fromPeriod?: string;
  pageSize?: number;
}

export async function fetchPriceIndex(params: FetchIndexParams): Promise<RebDataRow[]> {
  const { statblId, cycle = 'MM', fromPeriod, pageSize = 1000 } = params;

  const reqParams: Record<string, string | number> = {
    STATBL_ID: statblId,
    DTACYCLE_CD: cycle,
    pSize: pageSize,
  };
  if (fromPeriod) reqParams.WRTTIME_IDTFR_ID = fromPeriod;

  return rebGet<RebDataRow>('SttsApiTblData.do', reqParams);
}

// ── 월간 가격지수 시계열 ──────────────────────────────────────────

export interface PriceIndexPoint {
  period: string;
  region: string;
  value: number;
}

export async function fetchMonthlyPriceIndex(
  statblId: string,
  fromPeriod: string,
  regions?: string[],
): Promise<PriceIndexPoint[]> {
  const rows = await fetchPriceIndex({ statblId, cycle: 'MM', fromPeriod });

  return rows
    .filter(r => {
      if (!r.DTA_VAL || r.DTA_VAL.trim() === '') return false;
      if (regions && regions.length > 0) {
        return regions.some(region => r.ITM_NM.includes(region));
      }
      return true;
    })
    .map(r => ({
      period: r.WRTTIME_IDTFR_ID,
      region: r.ITM_NM,
      value: parseFloat(r.DTA_VAL),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}
