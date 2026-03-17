/** 서울시 25개 자치구 목록 및 법정동 코드 */
export const SEOUL_DISTRICTS: { name: string; code: string }[] = [
  { name: '서울 종로구', code: '11110' },
  { name: '서울 중구',   code: '11140' },
  { name: '서울 용산구', code: '11170' },
  { name: '서울 성동구', code: '11200' },
  { name: '서울 광진구', code: '11215' },
  { name: '서울 동대문구', code: '11230' },
  { name: '서울 중랑구', code: '11260' },
  { name: '서울 성북구', code: '11290' },
  { name: '서울 강북구', code: '11305' },
  { name: '서울 도봉구', code: '11320' },
  { name: '서울 노원구', code: '11350' },
  { name: '서울 은평구', code: '11380' },
  { name: '서울 서대문구', code: '11410' },
  { name: '서울 마포구', code: '11440' },
  { name: '서울 양천구', code: '11470' },
  { name: '서울 강서구', code: '11500' },
  { name: '서울 구로구', code: '11530' },
  { name: '서울 금천구', code: '11545' },
  { name: '서울 영등포구', code: '11560' },
  { name: '서울 동작구', code: '11590' },
  { name: '서울 관악구', code: '11620' },
  { name: '서울 서초구', code: '11650' },
  { name: '서울 강남구', code: '11680' },
  { name: '서울 송파구', code: '11710' },
  { name: '서울 강동구', code: '11740' },
];

export const SEOUL_DISTRICT_NAMES = SEOUL_DISTRICTS.map(d => d.name);

/** 서울 5대 생활권역 그룹 */
export const SEOUL_DISTRICT_GROUPS: { label: string; districts: string[] }[] = [
  { label: '도심권', districts: ['서울 종로구', '서울 중구', '서울 용산구'] },
  { label: '동북권', districts: ['서울 성동구', '서울 광진구', '서울 동대문구', '서울 중랑구', '서울 성북구', '서울 강북구', '서울 도봉구', '서울 노원구'] },
  { label: '서북권', districts: ['서울 은평구', '서울 서대문구', '서울 마포구'] },
  { label: '서남권', districts: ['서울 양천구', '서울 강서구', '서울 구로구', '서울 금천구', '서울 영등포구', '서울 동작구', '서울 관악구'] },
  { label: '동남권', districts: ['서울 서초구', '서울 강남구', '서울 송파구', '서울 강동구'] },
];

export const SEOUL_DISTRICT_CODE_MAP: Record<string, string> = Object.fromEntries(
  SEOUL_DISTRICTS.map(d => [d.name, d.code]),
);
