/**
 * 백엔드 API 클라이언트
 * 개발 시: Vite proxy (/api → http://localhost:3001) → VITE_API_BASE_URL 미설정
 * 프로덕션: VITE_API_BASE_URL 환경변수에 서버 URL 설정
 */

// 개발 시 VITE_API_BASE_URL을 설정하지 않으면 '/api' 로 fallback → Vite proxy 사용
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  // BASE가 절대 URL이면 그대로, 상대 경로면 현재 origin 기준으로 생성
  const base = BASE.startsWith('http') ? BASE : `${window.location.origin}${BASE}`;
  const url = new URL(`${base}${path}`);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString());
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new ApiError(res.status, json.error ?? '서버 오류가 발생했습니다.');
  }

  return json.data as T;
}

// ── 타입 정의 ────────────────────────────────────────────────────

export interface RealTransaction {
  id: string;
  complexName: string;
  district: string;
  neighborhood: string;
  districtCode: string;
  dealType: 'sale' | 'lease' | 'monthly';
  price: number;
  monthlyRent?: number;
  area: number;
  floor: number;
  buildYear: number;
  dealDate: string;
  isCancelled: boolean;
}

export interface ComplexStat {
  complexName: string;
  neighborhood: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  transactionCount: number;
  recentTransactions: RealTransaction[];
}

export interface PriceTrend {
  yearMonth: string;
  avgPrice: number;
  count: number;
}

export interface DeviationResult {
  actualAvgPrice: number;
  deviationPct: number;
  label: string;
  recentTransactions: RealTransaction[];
}

export interface DistrictSummary {
  district: string;
  count: number;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
}

// ── R-ONE 부동산통계정보 타입 ──────────────────────────────────

/** 통계표 목록 항목 */
export interface RebTableRow {
  STATBL_ID: string;   // 통계표 ID (fetchPriceIndex에 사용)
  STATBL_NM: string;   // 통계표명
  STTS_CYCLE: string;  // 주기 (MM: 월, WK: 주, YY: 연)
  ORG_ID: string;
  ORG_NM: string;
}

/** 가격지수 원본 데이터 행 */
export interface RebDataRow {
  STATBL_ID: string;
  ITM_ID: string;
  ITM_NM: string;             // 지역명 (예: 전국, 서울, 강남구)
  WRTTIME_IDTFR_ID: string;   // 기준 시점 (예: 202301)
  DTA_VAL: string;            // 지수값
  UNIT_NM?: string;
}

/** 월간 가격지수 시계열 포인트 (차트용) */
export interface PriceIndexPoint {
  period: string;   // 기준 연월 (예: '202301')
  region: string;   // 지역명
  value: number;    // 지수값
}

/** R-ONE 시세 월별 데이터 포인트 */
export interface RebMarketPoint {
  period: string;
  value: number;
}

/** R-ONE 지역별 시세 통계 */
export interface RebMarketStat {
  statblId: string;
  statblNm: string;    // 통계표명 (예: "아파트 매매가격지수")
  region: string;      // 지역명 (예: "강남구")
  unit: string;        // 단위 (예: "2021=100", "만원/㎡")
  dataPoints: RebMarketPoint[];
  latestPeriod: string;
  latestValue: number;
  prevPeriod: string | null;
  prevValue: number | null;
  changeRate: number | null;  // 전월 대비 변동률(%)
}

// ── API 함수 ──────────────────────────────────────────────────────

/** 아파트 실거래가 목록 */
export const api = {
  /** 실거래가 조회 */
  getTransactions(params: {
    district?: string;
    districtCode?: string;
    yearMonth?: string;
    dealType?: 'sale' | 'lease' | 'all';
    complex?: string;
    area?: number;
  }) {
    return request<RealTransaction[]>('/transactions', params as Record<string, string>);
  },

  /** 단지별 실거래 통계 */
  getComplexStats(params: {
    district?: string;
    districtCode?: string;
    months?: number;
    minCount?: number;
  }) {
    return request<ComplexStat[]>('/transactions/complex-stats', params as Record<string, string>);
  },

  /** 월별 평균가 추이 */
  getPriceTrend(params: {
    district?: string;
    districtCode?: string;
    months?: number;
  }) {
    return request<PriceTrend[]>('/transactions/price-trend', params as Record<string, string>);
  },

  /** 특정 매물 괴리율 계산 */
  getDeviation(params: {
    district?: string;
    districtCode?: string;
    complex?: string;
    area: number;
    listingPrice: number;
  }) {
    return request<DeviationResult>('/listings/deviation', params as unknown as Record<string, string>);
  },

  /** 지역별 요약 통계 */
  getDistrictSummary() {
    return request<DistrictSummary[]>('/listings/district-summary');
  },

  // ── R-ONE 부동산통계정보 API ───────────────────────────────────

  /**
   * 통계표 목록 조회
   * STATBL_ID를 모를 때 여기서 확인합니다.
   */
  getPriceIndexTables() {
    return request<RebTableRow[]>('/price-index/tables');
  },

  /**
   * 가격지수 원본 데이터 조회
   *
   * @param statblId  통계표 ID (getPriceIndexTables()로 확인)
   * @param cycle     데이터 주기: 'MM'(월·기본값) | 'WK'(주) | 'YY'(연)
   * @param fromPeriod 조회 시작 시점: 월=YYYYMM, 주=YYYYWW, 연=YYYY
   */
  getPriceIndex(params: {
    statblId: string;
    cycle?: 'MM' | 'WK' | 'YY';
    fromPeriod?: string;
    pageSize?: number;
  }) {
    return request<RebDataRow[]>('/price-index', params as unknown as Record<string, string>);
  },

  /**
   * 월간 가격지수 시계열 (차트용)
   *
   * @param statblId   통계표 ID
   * @param fromPeriod 조회 시작 연월 (예: '202501')
   * @param regions    지역 필터 (예: '전국,서울,강남구') — 생략 시 전체
   *
   * @example
   * // 서울 아파트 매매가격지수 2025년 1월부터
   * api.getMonthlyPriceIndex({
   *   statblId: 'A_2024_00240',
   *   fromPeriod: '202501',
   *   regions: '전국,서울',
   * });
   */
  getMonthlyPriceIndex(params: {
    statblId: string;
    fromPeriod: string;
    regions?: string;
  }) {
    return request<PriceIndexPoint[]>('/price-index/monthly', params as Record<string, string>);
  },

  // ── R-ONE 시세 현황 API ────────────────────────────────────────

  /**
   * 지역별 아파트 가격 시계열 (R-ONE 통계 기반)
   *
   * @param region   지역명 (예: '강남구', '서울')
   * @param dealType 거래유형 (기본 'all')
   * @param months   조회 개월 수 (기본 6)
   */
  getRebMarket(params: {
    region: string;
    dealType?: 'sale' | 'lease' | 'all';
    months?: number;
  }) {
    return request<RebMarketStat[]>('/reb/market', params as unknown as Record<string, string>);
  },

  /**
   * 서울 전 구 최신 가격 지수 개요
   */
  getRebMarketOverview(params?: { months?: number }) {
    return request<{ district: string; stats: RebMarketStat[] }[]>(
      '/reb/market/overview',
      params as unknown as Record<string, string>,
    );
  },
};
