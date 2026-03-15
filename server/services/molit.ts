/**
 * 국토교통부 실거래가 공공데이터 서비스
 * API 문서: https://www.data.go.kr/data/15058747/openapi.do (아파트매매실거래상세)
 *          https://www.data.go.kr/data/15058017/openapi.do (아파트전월세)
 */
import axios from 'axios';
import xml2js from 'xml2js';
import type { MolitSaleRaw, MolitLeaseRaw, Transaction } from '../types.js';

const BASE_URL = 'https://apis.data.go.kr/1613000';
const SERVICE_KEY = process.env.MOLIT_API_KEY ?? '';

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

function generateId(item: MolitSaleRaw | MolitLeaseRaw, type: string): string {
  return `${type}-${item.지역코드}-${item.아파트}-${item.년}${item.월}-${item.층}-${item.전용면적}`;
}

// ── 아파트 매매 실거래가 ──────────────────────────────────────────
export async function fetchSaleTransactions(
  districtCode: string,
  yearMonth: string, // "202401"
): Promise<Transaction[]> {
  const res = await axios.get(
    `${BASE_URL}/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade`,
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
    response: { body: { items: { item: MolitSaleRaw | MolitSaleRaw[] } } };
  }>(res.data);

  const body = parsed.response?.body;
  if (!body?.items?.item) return [];

  const items: MolitSaleRaw[] = Array.isArray(body.items.item)
    ? body.items.item
    : [body.items.item];

  return items
    .filter(item => !item.해제여부) // 해제된 거래 제외
    .map(item => ({
      id: generateId(item, 'sale'),
      complexName: item.아파트.trim(),
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
    response: { body: { items: { item: MolitLeaseRaw | MolitLeaseRaw[] } } };
  }>(res.data);

  const body = parsed.response?.body;
  if (!body?.items?.item) return [];

  const items: MolitLeaseRaw[] = Array.isArray(body.items.item)
    ? body.items.item
    : [body.items.item];

  return items.map(item => {
    const hasMonthlyRent = !!item.월세금액 && item.월세금액.trim() !== '0';
    return {
      id: generateId(item, 'lease'),
      complexName: item.아파트.trim(),
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
  months: string[], // ["202401", "202312", ...]
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
