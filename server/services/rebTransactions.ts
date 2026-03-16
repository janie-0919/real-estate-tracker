/**
 * 한국부동산원(REB) 아파트 실거래 데이터 서비스
 *
 * 데이터 출처: 한국부동산원 (data.go.kr, 기관코드 B552554)
 *   - 아파트매매 실거래 신고 자료
 *   - 아파트 전월세 신고 자료
 *
 * API 키 발급:
 *   https://www.data.go.kr 에서 아래 서비스 신청 후 인증키 발급
 *   - B552554 / 아파트매매 실거래 신고 자료
 *   - B552554 / 아파트 전월세 신고 자료
 *   발급받은 인증키를 .env의 REB_API_KEY 에 설정
 *
 * 엔드포인트:
 *   매매: https://apis.data.go.kr/B552554/RealEstateSaleSvc/getRealEstateSaleInfo
 *   전월세: https://apis.data.go.kr/B552554/RealEstateRentSvc/getRealEstateRentInfo
 */
import axios from 'axios';
import xml2js from 'xml2js';
import type { Transaction } from '../types.js';

const BASE_URL = 'https://apis.data.go.kr/B552554';
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
  const m = month.trim().padStart(2, '0');
  const d = (day ?? '1').trim().padStart(2, '0');
  return `${year.trim()}-${m}-${d}`;
}

// ── 아파트 매매 실거래가 ──────────────────────────────────────────

interface RebSaleItem {
  거래금액: string;
  건축년도: string;
  년: string;
  월: string;
  일: string;
  법정동: string;
  아파트명?: string;   // REB 필드명
  아파트?: string;    // MOLIT 호환 필드명
  전용면적: string;
  지역코드: string;
  층: string;
  해제여부?: string;
}

export async function fetchSaleTransactions(
  districtCode: string,
  yearMonth: string,
): Promise<Transaction[]> {
  const res = await axios.get(
    `${BASE_URL}/RealEstateSaleSvc/getRealEstateSaleInfo`,
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
    response: { body: { items: { item: RebSaleItem | RebSaleItem[] } } };
  }>(res.data);

  const body = parsed.response?.body;
  if (!body?.items?.item) return [];

  const items: RebSaleItem[] = Array.isArray(body.items.item)
    ? body.items.item
    : [body.items.item];

  return items
    .filter(item => !item.해제여부)
    .map(item => ({
      id: `reb-sale-${item.지역코드}-${item.아파트명 ?? item.아파트}-${item.년}${item.월}-${item.층}-${item.전용면적}`,
      complexName: (item.아파트명 ?? item.아파트 ?? '').trim(),
      district: `서울 ${getDistrictName(districtCode)}`,
      neighborhood: item.법정동.trim(),
      districtCode,
      dealType: 'sale' as const,
      price: parsePrice(item.거래금액),
      area: parseArea(item.전용면적),
      floor: parseInt(item.층, 10),
      buildYear: parseInt(item.건축년도, 10),
      dealDate: buildDealDate(item.년, item.월, item.일),
      isCancelled: false,
    }));
}

// ── 아파트 전월세 실거래가 ───────────────────────────────────────

interface RebRentItem {
  건축년도: string;
  년: string;
  월: string;
  일: string;
  법정동: string;
  아파트명?: string;
  아파트?: string;
  전용면적: string;
  지역코드: string;
  층: string;
  보증금액?: string;
  월세금액?: string;
}

export async function fetchLeaseTransactions(
  districtCode: string,
  yearMonth: string,
): Promise<Transaction[]> {
  const res = await axios.get(
    `${BASE_URL}/RealEstateRentSvc/getRealEstateRentInfo`,
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
    response: { body: { items: { item: RebRentItem | RebRentItem[] } } };
  }>(res.data);

  const body = parsed.response?.body;
  if (!body?.items?.item) return [];

  const items: RebRentItem[] = Array.isArray(body.items.item)
    ? body.items.item
    : [body.items.item];

  return items.map(item => {
    const hasMonthlyRent = !!item.월세금액 && item.월세금액.trim() !== '0';
    return {
      id: `reb-rent-${item.지역코드}-${item.아파트명 ?? item.아파트}-${item.년}${item.월}-${item.층}-${item.전용면적}`,
      complexName: (item.아파트명 ?? item.아파트 ?? '').trim(),
      district: `서울 ${getDistrictName(districtCode)}`,
      neighborhood: item.법정동.trim(),
      districtCode,
      dealType: hasMonthlyRent ? ('monthly' as const) : ('lease' as const),
      price: parsePrice(item.보증금액 ?? '0'),
      monthlyRent: hasMonthlyRent ? parsePrice(item.월세금액 ?? '0') : undefined,
      area: parseArea(item.전용면적),
      floor: parseInt(item.층, 10),
      buildYear: parseInt(item.건축년도, 10),
      dealDate: buildDealDate(item.년, item.월, item.일),
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
