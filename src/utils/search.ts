import { SEOUL_DISTRICTS } from '@/data/districts';

export interface ParsedSearch {
  /** 감지된 서울 자치구 (예: '서울 강남구'), 없으면 null */
  district: string | null;
  /** 구 이름을 제거한 나머지 검색어 */
  query: string;
}

/**
 * 자유 형식 검색어에서 서울 자치구 이름을 추출합니다.
 *
 * 예:
 *   "강남구 래미안"         → { district: '서울 강남구', query: '래미안' }
 *   "서울 서초구 원베일리"  → { district: '서울 서초구', query: '원베일리' }
 *   "래미안 원베일리"       → { district: null, query: '래미안 원베일리' }
 *   "영등포구"              → { district: '서울 영등포구', query: '' }
 */
export function parseSearchQuery(raw: string): ParsedSearch {
  const trimmed = raw.trim();
  if (!trimmed) return { district: null, query: '' };

  for (const d of SEOUL_DISTRICTS) {
    const full  = d.name;          // '서울 강남구'
    const short = d.name.slice(3); // '강남구'

    // 앞에서부터 매칭 (full 우선)
    if (trimmed.startsWith(full)) {
      return { district: full, query: trimmed.slice(full.length).trim() };
    }
    if (trimmed.startsWith(short)) {
      return { district: full, query: trimmed.slice(short.length).trim() };
    }
  }

  // 검색어 중간에 포함된 경우도 감지
  for (const d of SEOUL_DISTRICTS) {
    const full  = d.name;
    const short = d.name.slice(3);

    if (trimmed.includes(full)) {
      return { district: full, query: trimmed.replace(full, '').trim() };
    }
    if (trimmed.includes(short)) {
      return { district: full, query: trimmed.replace(short, '').trim() };
    }
  }

  return { district: null, query: trimmed };
}

/**
 * 검색 파라미터를 /listings URL로 직렬화합니다.
 */
export function buildListingsUrl(district: string | null, query: string): string {
  const params = new URLSearchParams();
  if (district) params.set('district', district);
  if (query)    params.set('q', query);
  const qs = params.toString();
  return qs ? `/listings?${qs}` : '/listings';
}
