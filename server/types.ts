/** 정규화된 실거래 데이터 */
export interface Transaction {
  id: string;
  complexName: string;
  district: string;
  neighborhood: string;
  districtCode: string;
  dealType: 'sale' | 'lease' | 'monthly';
  price: number;           // 매매가 또는 전세 보증금 (만원)
  monthlyRent?: number;    // 월세 (만원)
  area: number;            // 전용면적 (㎡)
  floor: number;
  buildYear: number;
  dealDate: string;        // "2024-01-10"
  isCancelled: boolean;
}

/** 단지별 집계 통계 */
export interface ComplexStat {
  complexName: string;
  district: string;
  neighborhood: string;
  districtCode: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  transactionCount: number;
  recentTransactions: Transaction[];
  priceByArea: Record<string, { avg: number; count: number }>;
}

/** 지역 코드 매핑 */
export const DISTRICT_CODES: Record<string, string> = {
  '서울 종로구': '11110',
  '서울 중구':   '11140',
  '서울 용산구': '11170',
  '서울 성동구': '11200',
  '서울 광진구': '11215',
  '서울 동대문구': '11230',
  '서울 중랑구': '11260',
  '서울 성북구': '11290',
  '서울 강북구': '11305',
  '서울 도봉구': '11320',
  '서울 노원구': '11350',
  '서울 은평구': '11380',
  '서울 서대문구': '11410',
  '서울 마포구': '11440',
  '서울 양천구': '11470',
  '서울 강서구': '11500',
  '서울 구로구': '11530',
  '서울 금천구': '11545',
  '서울 영등포구': '11560',
  '서울 동작구': '11590',
  '서울 관악구': '11620',
  '서울 서초구': '11650',
  '서울 강남구': '11680',
  '서울 송파구': '11710',
  '서울 강동구': '11740',
};

/** API 공통 응답 래퍼 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    totalCount: number;
    pageNo: number;
    numOfRows: number;
    yearMonth: string;
    districtCode: string;
  };
  error?: string;
}
