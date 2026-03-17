import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

/**
 * 대시보드 전용 훅
 *
 * 기존에 HomePage에서 7개의 개별 쿼리(useDistrictSummary, useTopComplexes,
 * useNationalStats, useTransactions × 3)를 날리던 것을 단 1번의 API 호출로 통합.
 *
 * ✅ 성능 개선 포인트:
 *   - HTTP 요청 수: 7개 → 1개
 *   - 서버 내부: 공유 캐시로 중복 외부 API 호출 제거
 *   - 클라이언트: staleTime 1시간으로 페이지 재방문 시 즉시 렌더링
 */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
    staleTime: 1000 * 60 * 60,        // 1시간 — 서버 캐시와 동기화
    gcTime: 1000 * 60 * 60 * 2,       // 2시간 메모리 유지
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
