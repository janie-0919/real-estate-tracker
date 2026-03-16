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
 *   발급받은 인증키를 .env의 DATA_GO_KR_API_KEY 에 설정
 *
 * 엔드포인트 (기술문서 기준):
 *   매매: https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev
 *   전월세: https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent
 *
 * 요청 파라미터:
 *   serviceKey  - 인증키 (URL Encode)
 *   pageNo      - 페이지 번호
 *   numOfRows   - 한 페이지 결과 수
 *   LAWD_CD     - 법정동코드 (시군구코드 5자리, 예: 11110)
 *   DEAL_YMD    - 계약월 (YYYYMM, 예: 202407)
 */
import axios from 'axios';
import xml2js from 'xml2js';
import type { Transaction } from '../types.js';

const BASE_URL = 'https://apis.data.go.kr/1613000';
// data.go.kr 실거래 API 키 — R-ONE 통계 API 키(reb.or.kr)와 별개
const SERVICE_KEY = process.env.DATA_GO_KR_API_KEY ?? process.env.REB_API_KEY ?? '';

const parser = new xml2js.Parser({ explicitArray: false, trim: true });

function parseXml<T>(xml: string): Promise<T> {
  return new Promise((resolve, reject) => {
    parser.parseString(xml, (err: Error | null, result: unknown) => {
      if (err) reject(err);
      else resolve(result as T);
    });
  });
}

function parsePrice(str: string): number {
  return parseInt(str.replace(/,/g, '').trim(), 10);
}

function parseArea(str: string): number {
  return parseFloat(str.trim());
}

function buildDealDate(year: string, month: string, day: string): string {
  const m = String(month ?? '1').trim().padStart(2, '0');
  const d = String(day ?? '1').trim().padStart(2, '0');
  return `${String(year).trim()}-${m}-${d}`;
}

// ── 아파트 매매 실거래가 ──────────────────────────────────────────
// 기술문서 기준 XML 응답 필드명 (영문)

interface AptTradeItem {
  aptNm: string;           // 아파트명
  buildYear: string;       // 건축년도
  dealYear: string;        // 계약년도
  dealMonth: string;       // 계약월
  dealDay: string;         // 계약일
  umdNm: string;           // 읍면동명 (법정동)
  dealAmount: string;      // 거래금액 (만원, 쉼표 포함, 예: "12,000")
  excluUseAr: string;      // 전용면적 (㎡)
  sggCd: string;           // 시군구코드 (지역코드 5자리)
  floor: string;           // 층
  cdealType?: string;      // 계약해제여부 (값 있으면 해제)
  cdealDay?: string;       // 계약해제일
  aptSeq?: string;         // 아파트 일련번호
  dealingGbn?: string;     // 거래유형 (중개거래 등)
  jibun?: string;          // 지번
  bonbun?: string;         // 본번
  bubun?: string;          // 부번
  aptDong?: string;        // 동
  landLeaseholdGbn?: string; // 토지임대부 여부
}

export async function fetchSaleTransactions(
  districtCode: string,
  yearMonth: string,
): Promise<Transaction[]> {
  const res = await axios.get(
    `${BASE_URL}/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev`,
    {
      params: {
        serviceKey: SERVICE_KEY,
        LAWD_CD: districtCode,
        DEAL_YMD: yearMonth,
        numOfRows: 1000,
        pageNo: 1,
      },
      responseType: 'text',
      timeout: 10_000,
    },
  );

  const parsed = await parseXml<{
    response: { body: { items: { item: AptTradeItem | AptTradeItem[] } } };
  }>(res.data);

  const body = parsed.response?.body;
  if (!body?.items?.item) return [];

  const items: AptTradeItem[] = Array.isArray(body.items.item)
    ? body.items.item
    : [body.items.item];

  return items
    .filter(item => !item.cdealType || item.cdealType.trim() === '')  // 계약해제 제외
    .map(item => ({
      id: `apt-trade-${item.sggCd}-${item.aptNm}-${item.dealYear}${item.dealMonth}-${item.floor}-${item.excluUseAr}`,
      complexName: (item.aptNm ?? '').trim(),
      district: `서울 ${getDistrictName(districtCode)}`,
      neighborhood: (item.umdNm ?? '').trim(),
      districtCode,
      dealType: 'sale' as const,
      price: parsePrice(item.dealAmount),
      area: parseArea(item.excluUseAr),
      floor: parseInt(item.floor, 10),
      buildYear: parseInt(item.buildYear, 10),
      dealDate: buildDealDate(item.dealYear, item.dealMonth, item.dealDay),
      isCancelled: false,
    }));
}

// ── 아파트 전월세 실거래가 ───────────────────────────────────────
// 기술문서 기준 XML 응답 필드명 (영문)

interface AptRentItem {
  aptNm: string;           // 아파트명
  buildYear: string;       // 건축년도
  year: string;            // 계약년도
  month: string;           // 계약월
  day: string;             // 계약일
  umdNm: string;           // 읍면동명 (법정동)
  deposit: string;         // 보증금 (만원)
  monthlyRent: string;     // 월세금액 (만원)
  excluUseAr: string;      // 전용면적 (㎡)
  sggCd: string;           // 시군구코드 (지역코드 5자리)
  floor: string;           // 층
  aptDong?: string;        // 동
  jibun?: string;          // 지번
  preDeposit?: string;     // 종전 보증금
  preMonthlyRent?: string; // 종전 월세
  contractType?: string;   // 계약구분 (신규/갱신)
  contractPeriod?: string; // 계약기간
  useRRRight?: string;     // 갱신요구권 사용 여부
}

export async function fetchLeaseTransactions(
  districtCode: string,
  yearMonth: string,
): Promise<Transaction[]> {
  const res = await axios.get(
    `${BASE_URL}/RTMSDataSvcAptRent/getRTMSDataSvcAptRent`,
    {
      params: {
        serviceKey: SERVICE_KEY,
        LAWD_CD: districtCode,
        DEAL_YMD: yearMonth,
        numOfRows: 1000,
        pageNo: 1,
      },
      responseType: 'text',
      timeout: 10_000,
    },
  );

  const parsed = await parseXml<{
    response: { body: { items: { item: AptRentItem | AptRentItem[] } } };
  }>(res.data);

  const body = parsed.response?.body;
  if (!body?.items?.item) return [];

  const items: AptRentItem[] = Array.isArray(body.items.item)
    ? body.items.item
    : [body.items.item];

  return items.map(item => {
    const monthlyRentAmt = item.monthlyRent ? parsePrice(item.monthlyRent) : 0;
    const hasMonthlyRent = monthlyRentAmt > 0;
    return {
      id: `apt-rent-${item.sggCd}-${item.aptNm}-${item.year}${item.month}-${item.floor}-${item.excluUseAr}`,
      complexName: (item.aptNm ?? '').trim(),
      district: `서울 ${getDistrictName(districtCode)}`,
      neighborhood: (item.umdNm ?? '').trim(),
      districtCode,
      dealType: hasMonthlyRent ? ('monthly' as const) : ('lease' as const),
      price: parsePrice(item.deposit ?? '0'),
      monthlyRent: hasMonthlyRent ? monthlyRentAmt : undefined,
      area: parseArea(item.excluUseAr),
      floor: parseInt(item.floor, 10),
      buildYear: parseInt(item.buildYear, 10),
      dealDate: buildDealDate(item.year, item.month, item.day),
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

function getDistrictName(code: string): string {
  const map: Record<string, string> = {
    '11110': '종로구', '11140': '중구', '11170': '용산구',
    '11200': '성동구', '11215': '광진구', '11230': '동대문구',
    '11260': '중랑구', '11290': '성북구', '11305': '강북구',
    '11320': '도봉구', '11350': '노원구', '11380': '은평구',
    '11410': '서대문구', '11440': '마포구', '11470': '양천구',
    '11500': '강서구', '11530': '구로구', '11545': '금천구',
    '11560': '영등포구', '11590': '동작구', '11620': '관악구',
    '11650': '서초구', '11680': '강남구', '11710': '송파구',
    '11740': '강동구',
  };
  return map[code] ?? code;
}
