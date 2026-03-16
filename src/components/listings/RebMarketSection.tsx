/**
 * R-ONE 한국부동산원 아파트 가격 시세 현황 섹션
 * - 선택 지역의 공식 가격지수 / 평균가격 표시
 * - recharts 스파크라인으로 6개월 추이 시각화
 */
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  YAxis,
} from 'recharts';
import type { RebMarketStat } from '@/services/api';
import styles from './RebMarketSection.module.scss';

interface Props {
  district: string;        // 예: '서울 강남구'
  stats: RebMarketStat[];
  isLoading: boolean;
  isError: boolean;
}

function formatPeriod(period: string): string {
  // '202412' → '24.12'
  return `${period.slice(2, 4)}.${period.slice(4, 6)}`;
}

function formatChangeRate(rate: number | null): { text: string; sign: 'up' | 'down' | 'flat' } {
  if (rate === null) return { text: '-', sign: 'flat' };
  const abs = Math.abs(rate);
  const text = `${abs.toFixed(2)}%`;
  if (rate > 0) return { text: `▲ ${text}`, sign: 'up' };
  if (rate < 0) return { text: `▼ ${text}`, sign: 'down' };
  return { text: `- ${text}`, sign: 'flat' };
}

// 통계표명에서 표시용 짧은 제목 생성
function cleanTitle(statblNm: string): string {
  return statblNm
    .replace(/^\(월\)\s*/, '')   // "(월)" 접두어 제거
    .replace('지역별 ', '')
    .replace('_아파트', '')
    .replace('가격지수', '지수')
    .replace('평균가격', '평균가')
    .trim();
}

// 단위 기준으로 값을 만원 단위로 정규화
function normalizeValue(
  value: number,
  unit: string,
): { display: string; normUnit: string } {
  if (unit.includes('천원')) {
    // 천원 → 만원 (÷10)
    const v = value / 10;
    return {
      display: v.toLocaleString(undefined, { maximumFractionDigits: 1 }),
      normUnit: unit.replace('천원', '만원'),
    };
  }
  if (unit === '원/㎡' || unit === '원') {
    // 원 → 만원 (÷10,000)
    const v = value / 10000;
    return {
      display: v.toLocaleString(undefined, { maximumFractionDigits: 1 }),
      normUnit: unit.replace('원', '만원'),
    };
  }
  if (unit.includes('=')) {
    // 지수 (예: 2021=100) — 소수점 1자리
    return { display: value.toFixed(1), normUnit: unit };
  }
  // 만원/㎡ 등 — 소수점 최대 2자리
  return {
    display: value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    normUnit: unit || '만원/㎡',
  };
}

function StatCard({ stat }: { stat: RebMarketStat }) {
  const change = formatChangeRate(stat.changeRate);
  const { display: valueDisplay, normUnit } = normalizeValue(stat.latestValue, stat.unit);

  const chartData = stat.dataPoints.map(p => {
    const { display } = normalizeValue(p.value, stat.unit);
    return {
      period: formatPeriod(p.period),
      value: parseFloat(display.replace(/,/g, '')),
    };
  });

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <p className={styles.cardTitle}>{cleanTitle(stat.statblNm)}</p>
        <span className={`${styles.changeRate} ${styles[change.sign]}`}>
          {change.text}
        </span>
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>{valueDisplay}</span>
        <span className={styles.unit}>{normUnit}</span>
      </div>
      <p className={styles.period}>{formatPeriod(stat.latestPeriod)} 기준</p>

      {chartData.length >= 2 && (
        <div className={styles.sparkline}>
          <ResponsiveContainer width="100%" height={48}>
            <LineChart data={chartData}>
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                contentStyle={{ fontSize: 11, padding: '2px 6px', borderRadius: 4 }}
                formatter={(v: number) => [v.toFixed(1), '']}
                labelFormatter={(l: string) => l}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={stat.changeRate !== null && stat.changeRate < 0 ? '#2563eb' : '#16a34a'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function RebMarketSection({ district, stats, isLoading, isError }: Props) {
  const guName = district.replace('서울 ', '');

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {guName} 공식 가격 시세
          <span className={styles.badge}>한국부동산원 R-ONE</span>
        </h2>
        {stats.length > 0 && (
          <p className={styles.subtitle}>
            최근 {stats[0]?.dataPoints.length ?? 0}개월 데이터
          </p>
        )}
      </div>

      {isLoading && (
        <div className={styles.loading}>
          <span className={styles.spinner} />
          R-ONE 시세 데이터 불러오는 중...
        </div>
      )}

      {isError && (
        <div className={styles.error}>
          R-ONE 데이터를 불러올 수 없습니다. REB_API_KEY 설정을 확인해주세요.
        </div>
      )}

      {!isLoading && !isError && stats.length === 0 && (
        <p className={styles.empty}>
          "{guName}" 지역 R-ONE 시세 데이터가 없습니다. 지역명 또는 통계표를 확인해주세요.
        </p>
      )}

      {!isLoading && stats.length > 0 && (
        <div className={styles.cardGrid}>
          {stats.map(stat => (
            <StatCard key={`${stat.statblId}_${stat.region}`} stat={stat} />
          ))}
        </div>
      )}
    </section>
  );
}
