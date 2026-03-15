/**
 * Format price in Korean won (만원 unit)
 */
export function formatPrice(manwon: number, dealType?: string): string {
  if (dealType === 'monthly' && manwon < 1000) {
    return `${manwon}만원`;
  }
  if (manwon >= 10000) {
    const eok = Math.floor(manwon / 10000);
    const remain = manwon % 10000;
    if (remain === 0) return `${eok}억`;
    return `${eok}억 ${remain.toLocaleString()}만`;
  }
  return `${manwon.toLocaleString()}만원`;
}

export function formatPriceShort(manwon: number): string {
  if (manwon >= 10000) {
    const eok = (manwon / 10000).toFixed(1);
    return `${eok}억`;
  }
  return `${manwon.toLocaleString()}만`;
}

export function formatPriceChange(change: number): string {
  const abs = Math.abs(change);
  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  return `${sign}${formatPrice(abs)}`;
}

export function formatDeviation(deviation: number): string {
  const sign = deviation > 0 ? '+' : '';
  return `${sign}${deviation.toFixed(1)}%`;
}

export function formatArea(sqm: number): string {
  const pyeong = sqm / 3.3058;
  return `${sqm}㎡ (${pyeong.toFixed(0)}평)`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  });
}

export function formatBuildYear(year: number): string {
  const age = new Date().getFullYear() - year;
  return `${year}년 (${age === 0 ? '신축' : `${age}년차`})`;
}

export function formatDealType(dealType: string): string {
  const map: Record<string, string> = {
    sale: '매매',
    lease: '전세',
    monthly: '월세',
  };
  return map[dealType] ?? dealType;
}

export function getDeviationClass(deviation: number): string {
  if (deviation <= -3) return 'deviation-flash';
  if (deviation <= 0) return 'deviation-near';
  if (deviation <= 3) return 'deviation-normal';
  if (deviation <= 6) return 'deviation-high';
  return 'deviation-very-high';
}

export function getDeviationColor(deviation: number): string {
  if (deviation <= -3) return '#2563eb';
  if (deviation <= 0) return '#16a34a';
  if (deviation <= 3) return '#6b7280';
  if (deviation <= 6) return '#d97706';
  return '#dc2626';
}
