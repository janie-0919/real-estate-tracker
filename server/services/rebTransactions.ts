/**
 * 국토교통부 아파트 실거래 데이터 서비스
 *
 * 데이터 출처: 국토교통부 (data.go.kr, 기관코드 1613000)
 *   - 아파트매매 실거래 신고 자료 (개발계정)
 *   - 아파트 전월세 신고 자료
 *
 * API 키 발급:
 *   https://www.data.go.kr 에서 아래 서비스 신청 후 인증키 발급
 *   - 1613000 / RTMSDataSvcAptTradeDev (아파트매매 실거래 신고 자료 개발계정)
 *   - 1613000 / RTMSDataSvcAptRent (아파트 전월세 신고 자료)
 *   발급받은 인증키(Decoding)를 .env의 DATA_GO_KR_API_KEY 에 설정
 *
 * 엔드포인트 (기술문서 기준):
 *   매매: https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev
 *   전월세: https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent
 *
 * 응답 형식:
 *   매매(TradeDev): JSON  → axios 기본 파싱
 *   전월세(Rent):   XML   → xml2js 파싱 (기술문서 명시)
 *
 * 요청 파라미터:
 *   serviceKey  - 인증키(Decoding)
 *   pageNo      - 페이지 번호
 *   numOfRows   - 한 페이지 결과 수 (기본 10, 최대 1000)
 *   LAWD_CD     - 법정동코드 (시군구코드 5자리, 예: 11110)
 *   DEAL_YMD    - 계약월 (YYYYMM, 예: 202407)
 */
import axios from 'axios';
import type { Transaction } from '../types.js';
import { DISTRICT_NAME_BY_CODE } from '../types.js';

const BASE_URL = 'https://apis.data.go.kr/1613000';
// data.go.kr 실거래 API 키 (Decoding 키) — R-ONE 통계 API 키(reb.or.kr)와 별개
const SERVICE_KEY = process.env.DATA_GO_KR_API_KEY ?? process.env.REB_API_KEY ?? '';

function parsePrice(str: string | number): number {
  if (typeof str === 'number') return str;
  return parseInt(String(str).replace(/,/g, '').trim(), 10);
}

function parseArea(str: string | number): number {
  if (typeof str === 'number') return str;
  return parseFloat(String(str).trim());
}

function buildDealDate(year: string | number, month: string | number, day: string | number): string {
  const y = String(year).trim();
  const m = String(month).trim().padStart(2, '0');
  const d = String(day ?? '1').trim().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── 아파트 매매 실거래가 ──────────────────────────────────────────
// 기술문서 기준 JSON 응답 필드명

interface AptTradeItem {
  aptNm: string;           // 아파트명
  buildYear: string | number; // 건축년도
  dealYear: string | number;  // 계약년도
  dealMonth: string | number; // 계약월
  dealDay: string | number;   // 계약일
  umdNm: string;           // 읍면동명 (법정동)
  dealAmount: string;      // 거래금액 (만원, 쉼표 포함, 예: "12,000")
  excluUseAr: string | number; // 전용면적 (㎡)
  sggCd: string | number;  // 시군구코드 (지역코드 5자리)
  floor: string | number;  // 층
  cdealType?: string;      // 계약해제여부 (공백 또는 'O')
  cdealDay?: string;       // 계약해제일
  aptSeq?: string;         // 아파트 일련번호
  aptDong?: string;        // 동
  dealingGbn?: string;     // 거래유형 (중개거래/직거래)
  jibun?: string;          // 지번
  bonbun?: string;         // 본번
  bubun?: string;          // 부번
  landLeaseholdGbn?: string; // 토지임대부 여부
  buyerGbn?: string;       // 매수자구분
  slerGbn?: string;        // 매도자구분
  rgstDate?: string;       // 등기일자
}

interface DataGoKrResponse<T> {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: { item: T | T[] } | '' | null;
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

export async function fetchSaleTransactions(
  districtCode: string,
  yearMonth: string,
): Promise<Transaction[]> {
  const res = await axios.get<DataGoKrResponse<AptTradeItem>>(
    `${BASE_URL}/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev`,
    {
      params: {
        serviceKey: SERVICE_KEY,
        LAWD_CD: districtCode,
        DEAL_YMD: yearMonth,
        numOfRows: 1000,
        pageNo: 1,
      },
      timeout: 10_000,
      validateStatus: () => true,  // HTTP 에러코드도 응답으로 처리 (throw 방지)
    },
  );

  if (res.status !== 200) {
    console.warn(`[fetchSaleTransactions] HTTP ${res.status} - districtCode:${districtCode} yearMonth:${yearMonth}`);
    return [];
  }

  const header = res.data?.response?.header;
  if (header?.resultCode !== '000') {
    console.warn(`[fetchSaleTransactions] API 오류: ${header?.resultCode} - ${header?.resultMsg}`);
    return [];
  }

  const bodyItems = res.data?.response?.body?.items;
  if (!bodyItems || typeof bodyItems !== 'object' || !('item' in bodyItems) || !bodyItems.item) return [];

  const items: AptTradeItem[] = Array.isArray(bodyItems.item)
    ? bodyItems.item
    : [bodyItems.item];

  return items
    .filter(item => !item.cdealType || String(item.cdealType).trim() === '')  // 계약해제 제외
    .map(item => ({
      id: `apt-trade-${item.sggCd}-${item.aptNm}-${item.dealYear}${String(item.dealMonth).padStart(2,'0')}${String(item.dealDay ?? '01').padStart(2,'0')}-${item.floor}-${item.excluUseAr}`,
      complexName: (item.aptNm ?? '').trim(),
      district: DISTRICT_NAME_BY_CODE[districtCode] ?? districtCode,
      neighborhood: (item.umdNm ?? '').trim(),
      districtCode,
      dealType: 'sale' as const,
      price: parsePrice(item.dealAmount),
      area: parseArea(item.excluUseAr),
      floor: parseInt(String(item.floor), 10),
      buildYear: parseInt(String(item.buildYear), 10),
      dealDate: buildDealDate(item.dealYear, item.dealMonth, item.dealDay),
      isCancelled: false,
    }));
}

// ── 아파트 전월세 실거래가 ───────────────────────────────────────
// 기술문서 기준: 응답 형식 XML, 필드명 영문
// XML 샘플: <dealYear>, <dealMonth>, <dealDay>, <deposit>, <monthlyRent>, <excluUseAr>, <sggCd>, <umdNm>

interface AptRentItem {
  aptNm: string;              // 아파트명
  aptSeq?: string;            // 아파트 일련번호
  buildYear: string | number; // 건축년도
  dealYear: string | number;  // 계약년도  ← 기술문서: dealYear (매매와 동일)
  dealMonth: string | number; // 계약월
  dealDay: string | number;   // 계약일
  umdNm: string;              // 읍면동명 (법정동)
  deposit: string;            // 보증금 (만원, 예: "50,000")
  monthlyRent: string;        // 월세금액 (만원, 예: "0")
  excluUseAr: string | number;// 전용면적 (㎡)
  sggCd: string | number;     // 시군구코드 (지역코드 5자리)
  floor: string | number;     // 층
  jibun?: string;             // 지번
  contractTerm?: string;      // 계약기간
  contractType?: string;      // 계약구분 (신규/갱신)
  preDeposit?: string;        // 종전 보증금
  preMonthlyRent?: string;    // 종전 월세
  useRRRight?: string;        // 갱신요구권 사용 여부
  roadnm?: string;            // 도로명
  roadnmcd?: string;          // 도로명코드
  roadnmseq?: string;         // 도로명일련번호
  roadnmbcd?: string;         // 도로명지상지하코드
  roadnmbonbun?: string;      // 도로명건물본번호
  roadnmbubun?: string;       // 도로명건물부번호
  roadnmsggcd?: string;       // 도로명시군구코드
}

export async function fetchLeaseTransactions(
  districtCode: string,
  yearMonth: string,
): Promise<Transaction[]> {
  // 전월세 API: 실제 응답은 JSON (기술문서와 달리 XML이 아님)
  const res = await axios.get<DataGoKrResponse<AptRentItem>>(
    `${BASE_URL}/RTMSDataSvcAptRent/getRTMSDataSvcAptRent`,
    {
      params: {
        serviceKey: SERVICE_KEY,
        LAWD_CD: districtCode,
        DEAL_YMD: yearMonth,
        numOfRows: 1000,
        pageNo: 1,
      },
      timeout: 10_000,
      validateStatus: () => true,
    },
  );

  if (res.status === 403) {
    console.warn(`[fetchLeaseTransactions] 403 Forbidden - data.go.kr에서 '아파트 전월세 신고 자료' 서비스 활용 신청 필요`);
    return [];
  }
  if (res.status !== 200) {
    console.warn(`[fetchLeaseTransactions] HTTP ${res.status} - districtCode:${districtCode} yearMonth:${yearMonth}`);
    return [];
  }

  const header = res.data?.response?.header;
  if (header?.resultCode !== '000') {
    console.warn(`[fetchLeaseTransactions] API 오류: ${header?.resultCode} - ${header?.resultMsg}`);
    return [];
  }

  const bodyItems = res.data?.response?.body?.items;
  if (!bodyItems || typeof bodyItems !== 'object' || !('item' in bodyItems) || !bodyItems.item) return [];

  const items: AptRentItem[] = Array.isArray(bodyItems.item)
    ? bodyItems.item
    : [bodyItems.item];

  return items.map(item => {
    const monthlyRentAmt = item.monthlyRent ? parsePrice(item.monthlyRent) : 0;
    const hasMonthlyRent = monthlyRentAmt > 0;
    return {
      id: `apt-rent-${item.sggCd}-${item.aptNm}-${item.dealYear}${String(item.dealMonth).padStart(2,'0')}${String(item.dealDay ?? '01').padStart(2,'0')}-${item.floor}-${item.excluUseAr}`,
      complexName: (item.aptNm ?? '').trim(),
      district: DISTRICT_NAME_BY_CODE[districtCode] ?? districtCode,
      neighborhood: (item.umdNm ?? '').trim(),
      districtCode,
      dealType: hasMonthlyRent ? ('monthly' as const) : ('lease' as const),
      price: parsePrice(item.deposit ?? '0'),
      monthlyRent: hasMonthlyRent ? monthlyRentAmt : undefined,
      area: parseArea(item.excluUseAr),
      floor: parseInt(String(item.floor), 10),
      buildYear: parseInt(String(item.buildYear), 10),
      dealDate: buildDealDate(item.dealYear, item.dealMonth, item.dealDay),
      isCancelled: false,
    };
  });
}

// ── 여러 달 범위 조회 ────────────────────────────────────────────

export async function fetchTransactionRange(
  districtCode: string,
  months: string[],
  dealType: 'sale' | 'lease' | 'all' = 'all',
): Promise<Transaction[]> {
  const fetchers = months.flatMap(ym => {
    const tasks = [];
    if (dealType === 'sale' || dealType === 'all') {
      tasks.push(fetchSaleTransactions(districtCode, ym));
    }
    if (dealType === 'lease' || dealType === 'all') {
      tasks.push(fetchLeaseTransactions(districtCode, ym));
    }
    return tasks;
  });

  const results = await Promise.allSettled(fetchers);
  return results
    .filter((r): r is PromiseFulfilledResult<Transaction[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

// ── 단지별 집계 ──────────────────────────────────────────────────

export function aggregateByComplex(
  transactions: Transaction[],
): Map<string, {
  complexName: string;
  neighborhood: string;
  transactions: Transaction[];
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}> {
  const map = new Map<string, {
    complexName: string;
    neighborhood: string;
    transactions: Transaction[];
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
  }>();

  for (const t of transactions) {
    const key = `${t.complexName}_${t.neighborhood}`;
    if (!map.has(key)) {
      map.set(key, {
        complexName: t.complexName,
        neighborhood: t.neighborhood,
        transactions: [],
        avgPrice: 0,
        minPrice: Infinity,
        maxPrice: 0,
      });
    }
    const entry = map.get(key)!;
    entry.transactions.push(t);
    entry.minPrice = Math.min(entry.minPrice, t.price);
    entry.maxPrice = Math.max(entry.maxPrice, t.price);
  }

  for (const entry of map.values()) {
    const total = entry.transactions.reduce((s, t) => s + t.price, 0);
    entry.avgPrice = Math.round(total / entry.transactions.length);
  }

  return map;
}

// ── 최근 N개월 yearMonth 배열 생성 ──────────────────────────────

export function getRecentMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(ym);
  }
  return months;
}
