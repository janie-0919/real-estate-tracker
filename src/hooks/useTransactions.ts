import { useQuery } from '@tanstack/react-query';
import { api, type RealTransaction } from '@/services/api';
import { formatPrice } from '@/utils/format';

// ── Query keys ────────────────────────────────────────────────────
export const txKeys = {
  all: ['transactions'] as const,
  list: (params: object) => ['transactions', 'list', params] as const,
  complexStats: (params: object) => ['transactions', 'complex-stats', params] as const,
  priceTrend: (params: object) => ['transactions', 'price-trend', params] as const,
};

// ── 실거래가 목록 ─────────────────────────────────────────────────
export function useTransactions(params: {
  district?: string;
  districtCode?: string;
  yearMonth?: string;
  dealType?: 'sale' | 'lease' | 'all';
  complex?: string;
  area?: number;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params;
  const hasLocation = !!(queryParams.district || queryParams.districtCode);

  return useQuery({
    queryKey: txKeys.list(queryParams),
    queryFn: () => api.getTransactions(queryParams),
    enabled: enabled && hasLocation,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
}

// ── 단지별 실거래 통계 ────────────────────────────────────────────
export function useComplexStats(params: {
  district?: string;
  districtCode?: string;
  months?: number;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params;
  const hasLocation = !!(queryParams.district || queryParams.districtCode);

  return useQuery({
    queryKey: txKeys.complexStats(queryParams),
    queryFn: () => api.getComplexStats(queryParams),
    enabled: enabled && hasLocation,
    staleTime: 1000 * 60 * 60,
  });
}

// ── 월별 가격 추이 ────────────────────────────────────────────────
export function usePriceTrend(params: {
  district?: string;
  districtCode?: string;
  months?: number;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params;
  const hasLocation = !!(queryParams.district || queryParams.districtCode);

  return useQuery({
    queryKey: txKeys.priceTrend(queryParams),
    queryFn: () => api.getPriceTrend(queryParams),
    enabled: enabled && hasLocation,
    staleTime: 1000 * 60 * 60,
  });
}

// ── 괴리율 계산 훅 ────────────────────────────────────────────────
export function useDeviation(params: {
  district?: string;
  complex?: string;
  area: number;
  listingPrice: number;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params;
  const isReady = !!(queryParams.district && queryParams.area && queryParams.listingPrice);

  return useQuery({
    queryKey: ['deviation', queryParams],
    queryFn: () => api.getDeviation(queryParams),
    enabled: enabled && isReady,
    staleTime: 1000 * 60 * 60 * 6,
  });
}

// ── 지역 요약 ─────────────────────────────────────────────────────
export function useDistrictSummary() {
  return useQuery({
    queryKey: ['district-summary'],
    queryFn: () => api.getDistrictSummary(),
    staleTime: 1000 * 60 * 60 * 24,
  });
}

// ── 유틸: 실거래 차트 데이터 변환 ────────────────────────────────
export function toChartData(transactions: RealTransaction[]) {
  return transactions
    .sort((a, b) => a.dealDate.localeCompare(b.dealDate))
    .map(t => ({
      date: t.dealDate.slice(5), // "MM-DD"
      price: t.price,
      label: `${t.floor}층 ${formatPrice(t.price)}`,
      floor: t.floor,
      area: t.area,
    }));
}
