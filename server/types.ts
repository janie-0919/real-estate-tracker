// ============================================================
// 국토교통부 실거래가 API 응답 타입
// ============================================================

/** 아파트 매매 실거래 원본 응답 */
export interface MolitSaleRaw {
  거래금액: string;        // "88,000"
  거래유형?: string;       // "중개거래"
  건축년도: string;        // "2023"
  년: string;             // "2024"
  월: string;             // "1"
  일: string;             // "10"
  법정동: string;          // "반포동"
  아파트: string;          // "래미안원베일리"
  전용면적: string;        // "84.9"
  지역코드: string;        // "11650"
  층: string;             // "8"
  도로명?: string;
  해제여부?: string;
  해제사유발생일?: string;
  등기일자?: string;
}

/** 아파트 전월세 실거래 원본 응답 */
export interface MolitLeaseRaw {
  갱신요구권사용?: string;
  건축년도: string;
  계약구분?: string;
  계약기간?: string;
  년: string;
  월: string;
  일: string;
  법정동: string;
  아파트: string;
  전용면적: string;
  종전계약보증금?: string;
  종전계약월세?: string;
  지역코드: string;
  층: string;
  보증금액?: string;      // 전세
  월세금액?: string;      // 월세
}

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
