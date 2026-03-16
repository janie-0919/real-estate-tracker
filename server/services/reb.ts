/**
 * 한국부동산원(R-ONE) 부동산통계정보 Open API
 *
 * 제공 데이터:
 *   - 전국주택가격동향조사 (아파트 매매/전세 가격지수, 지역별 월간)
 *   - 공동주택 실거래가격지수
 *   - 기타 부동산 통계
 *
 * 인증키 발급:
 *   https://www.reb.or.kr/r-one/portal/openapi/openApiListPage.do
 *   (R-ONE 로그인 후 API 신청 → REB_API_KEY 환경변수에 설정)
 *
 * API 구조:
 *   - 통계표 목록: GET /SttsApiTbl.do?KEY=...&Type=json
 *   - 통계 데이터: GET /SttsApiTblData.do?KEY=...&STATBL_ID=...&DTACYCLE_CD=MM&WRTTIME_IDTFR_ID=202301&Type=json
 *
 * 주요 통계표 ID (STATBL_ID):
 *   아파트 매매가격지수 (지역별 월간): 아래 fetchTableList()로 전체 목록 확인 가능
 *   개발가이드: https://www.reb.or.kr/r-one/portal/openapi/openApiDevPage.do
 */

import axios from 'axios';

const BASE_URL = 'https://www.reb.or.kr/r-one/openapi';
const API_KEY = process.env.REB_API_KEY ?? 'sample';

// API 키가 'sample'이면 결과가 10건으로 제한됨
export const isUsingDefaultKey = () => API_KEY === 'sample';

// ── 공통 응답 타입 ──────────────────────────────────────────────

export interface RebTableRow {
  STATBL_ID: string;     // 통계표 ID
  STATBL_NM: string;     // 통계표명
  STTS_CYCLE: string;    // 주기 (MM: 월, WK: 주, YY: 연)
  ORG_ID: string;        // 기관 ID
  ORG_NM: string;        // 기관명
}

export interface RebDataRow {
  STATBL_ID: string;     // 통계표 ID
  ITM_ID: string;        // 항목 ID
  ITM_NM: string;        // 항목명 (예: 전국, 서울, 강남구 등)
  WRTTIME_IDTFR_ID: string; // 기준 시점 (예: 202301)
  DTA_VAL: string;       // 통계값
  UNIT_NM?: string;      // 단위
}

interface RebApiResponse<T> {
  SttsApiTbl?: { row?: T[] };
  SttsApiTblData?: { row?: T[] };
  RESULT?: { CODE: string; MESSAGE: string };
}

// ── 내부 요청 헬퍼 ──────────────────────────────────────────────

async function rebGet<T>(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<T[]> {
  const res = await axios.get<RebApiResponse<T>>(`${BASE_URL}/${endpoint}`, {
    params: {
      KEY: API_KEY,
      Type: 'json',
      pIndex: 1,
      pSize: 1000,
      ...params,
    },
    timeout: 15_000,
  });

  const data = res.data;

  // 오류 코드 처리
  if (data.RESULT?.CODE && data.RESULT.CODE !== 'INFO-000') {
    throw new Error(`R-ONE API 오류: ${data.RESULT.CODE} - ${data.RESULT.MESSAGE}`);
  }

  // SttsApiTbl 또는 SttsApiTblData 키에서 row 추출
  const rows =
    (data.SttsApiTbl?.row) ??
    (data.SttsApiTblData?.row) ??
    [];

  return rows;
}

// ── 통계표 목록 조회 ────────────────────────────────────────────

/**
 * 제공 중인 통계표 전체 목록 반환
 * STATBL_ID를 확인할 때 사용
 */
export async function fetchTableList(): Promise<RebTableRow[]> {
  return rebGet<RebTableRow>('SttsApiTbl.do', {});
}

// ── 통계 데이터 조회 ────────────────────────────────────────────

export interface FetchIndexParams {
  /** 통계표 ID (필수) */
  statblId: string;
  /**
   * 데이터 주기
   *   'MM' = 월별 (기본값)
   *   'WK' = 주별
   *   'YY' = 연별
   */
  cycle?: 'MM' | 'WK' | 'YY';
  /**
   * 조회 시작 시점
   *   월별: 'YYYYMM' (예: '202301')
   *   주별: 'YYYYWW' (예: '202301' → 2023년 1주차)
   *   연별: 'YYYY'   (예: '2022')
   *   생략 시 최근 데이터부터 pSize만큼 반환
   */
  fromPeriod?: string;
  /** 페이지당 결과 수 (기본 1000) */
  pageSize?: number;
}

/**
 * 특정 통계표의 데이터 조회
 *
 * @example
 * // 아파트 매매가격지수 (STATBL_ID는 fetchTableList()로 확인)
 * const rows = await fetchPriceIndex({
 *   statblId: 'A_2024_00240',
 *   cycle: 'MM',
 *   fromPeriod: '202301',
 * });
 */
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

// ── 편의 함수: 아파트 가격지수 월간 추이 ────────────────────────

export interface PriceIndexPoint {
  period: string;   // 기준 시점 (예: '202301')
  region: string;   // 지역명 (예: '전국', '서울', '강남구')
  value: number;    // 지수값
}

/**
 * 아파트 가격지수 월간 데이터를 지역별 시계열로 변환
 *
 * @param statblId  통계표 ID (매매/전세 구분)
 * @param fromPeriod 조회 시작 연월 (예: '202301')
 * @param regions   필터링할 지역명 목록 (없으면 전체 반환)
 */
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
