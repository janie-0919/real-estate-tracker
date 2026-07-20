import { useQuery } from '@tanstack/react-query';
import { api, type DashboardData } from '@/services/api';

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
 *
 * initialData가 주어지면(서버 컴포넌트에서 미리 가져온 값) 최초 렌더부터
 * 실데이터로 표시되어 로딩 스켈레톤 없이 SSR 콘텐츠가 그대로 노출됩니다.
 */
export function useDashboard(initialData?: DashboardData) {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
    initialData,
    staleTime: 1000 * 60 * 60,        // 1시간 — 서버 캐시와 동기화
    gcTime: 1000 * 60 * 60 * 2,       // 2시간 메모리 유지
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
