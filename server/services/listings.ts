/**
 * 매물 호가 데이터 서비스
 *
 * 현재 공개된 매물 API는 없으므로 두 가지 옵션:
 *   A. 직방/다방 비공식 API 파싱 (아래 구현, 실운영 시 이용약관 확인 필요)
 *   B. 자체 수동 입력 / 크롤링 파이프라인 연결
 *
 * 현재는 직방 비공식 API 구조를 보여주고,
 * 실거래가와 결합해 괴리율을 계산하는 로직을 포함합니다.
 */
import axios from 'axios';
import type { Transaction } from '../types.js';

// ── 직방 비공식 API 타입 ─────────────────────────────────────────
interface ZigbangItem {
  item_id: number;
  name: string;          // 단지명
  address: string;
  price: number;         // 만원
  price_title: string;   // "10억 5,000"
  area: number;          // 전용면적 (㎡)
  floor: string;         // "5/25"
  direction: string;
  type: string;          // "아파트"
  deal_type: string;     // "매매" | "전세" | "월세"
  deposit: number;
  monthly_price: number;
  thumbnail: string;
  updated_at: string;
  tags: string[];
}

interface ZigbangResponse {
  items: ZigbangItem[];
  total_count: number;
}

// 직방 geohash 변환 (서울 주요 지역)
const REGION_GEOHASH: Record<string, string> = {
  '서울 서초구': 'wydm6',
  '서울 강남구': 'wydm3',
  '서울 마포구': 'wydjz',
  '서울 성동구': 'wydmt',
  '서울 용산구': 'wydme',
  '서울 송파구': 'wydn1',
  '서울 영등포구': 'wydj9',
  '서울 노원구': 'wydng',
};

/**
 * 직방 매물 조회 (비공식 API - 이용약관 확인 필요)
 * 실제 운영 시 직방 파트너 API 또는 자체 크롤러로 교체
 */
export async function fetchZigbangListings(district: string): Promise<ZigbangItem[]> {
  const geohash = REGION_GEOHASH[district];
  if (!geohash) return [];

  try {
    const res = await axios.get<ZigbangResponse>(
      'https://apis.zigbang.com/v2/items',
      {
        params: {
          domain: 'zigbang',
          geohash,
          needHasNoFiltered: true,
          item_ids: '',
          type: 'apart',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Referer: 'https://www.zigbang.com',
        },
        timeout: 8_000,
      },
    );
    return res.data.items ?? [];
  } catch {
    // 네트워크 오류 또는 차단 시 빈 배열 반환
    return [];
  }
}

// ── 괴리율 계산 ──────────────────────────────────────────────────
export interface DeviationResult {
  actualAvgPrice: number;
  deviationPct: number;
  label: string;
  recentTransactions: Transaction[];
}

export function calcDeviation(
  listingPrice: number,
  transactions: Transaction[],
  area: number,
): DeviationResult {
  // 같은 평형(±5㎡) 최근 6개월 실거래만 필터
  const similar = transactions
    .filter(t => Math.abs(t.area - area) <= 5 && t.dealType === 'sale')
    .sort((a, b) => b.dealDate.localeCompare(a.dealDate))
    .slice(0, 10);

  if (similar.length === 0) {
    return { actualAvgPrice: 0, deviationPct: 0, label: '데이터 없음', recentTransactions: [] };
  }

  const avg = Math.round(similar.reduce((s, t) => s + t.price, 0) / similar.length);
  const pct = parseFloat((((listingPrice - avg) / avg) * 100).toFixed(1));

  const label =
    pct <= -5 ? '급매 후보' :
    pct <= 0  ? '실거래가 근접' :
    pct <= 3  ? '시세 수준' :
    pct <= 7  ? '다소 높음' :
                '과대호가 가능성';

  return { actualAvgPrice: avg, deviationPct: pct, label, recentTransactions: similar };
}
