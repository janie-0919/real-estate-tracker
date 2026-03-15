/**
 * 백엔드 API 클라이언트
 * 개발 시: Vite proxy → http://localhost:3001
 * 프로덕션: VITE_API_BASE_URL 환경변수
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

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
  const url = new URL(`${BASE}${path}`, window.location.origin);
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
};
