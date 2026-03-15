import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Scatter, ComposedChart,
} from 'recharts';
import { mockComplexes, mockListings } from '@/data/mockListings';
import { formatPrice, formatDate, formatDateShort } from '@/utils/format';
import { useTransactions, usePriceTrend, toChartData } from '@/hooks/useTransactions';
import ListingCard from '@/components/listings/ListingCard';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import NotFoundPage from '@/pages/NotFound/NotFoundPage';
import styles from './ComplexDetailPage.module.scss';

export default function ComplexDetailPage() {
  const { id } = useParams<{ id: string }>();
  const complex = mockComplexes.find(c => c.id === id);
  if (!complex) return <NotFoundPage />;

  const complexListings = mockListings.filter(l => l.complexId === id);
  const flashListings = complexListings.filter(l => (l.deviationFromActual ?? 0) < 0);

  // ── 실거래가 (공공 API) ─────────────────────────────────────────
  const { data: realTransactions, isLoading: txLoading } = useTransactions({
    district: complex.district,
    complex: complex.name,
    dealType: 'sale',
  });

  // ── 월별 가격 추이 (공공 API) ────────────────────────────────────
  const { data: priceTrend, isLoading: trendLoading } = usePriceTrend({
    district: complex.district,
    months: 6,
  });

  // 차트 데이터 – 실데이터 우선, 없으면 mock 30일 데이터
  const trendChartData = priceTrend && priceTrend.length > 0
    ? priceTrend.map(d => ({ date: d.yearMonth.slice(4), avg: d.avgPrice, count: d.count }))
    : complex.priceHistory30d.map(d => ({ date: formatDateShort(d.date), avg: d.avgPrice, count: 0 }));

  const realTxChart = realTransactions ? toChartData(realTransactions) : [];

  // 평형별 실거래 통계
  const areaStats = realTransactions
    ? Object.entries(
        realTransactions.reduce<Record<string, { prices: number[]; count: number }>>((acc, t) => {
          const key = `${Math.round(t.area / 10) * 10}㎡급`;
          if (!acc[key]) acc[key] = { prices: [], count: 0 };
          acc[key].prices.push(t.price);
          acc[key].count += 1;
          return acc;
        }, {}),
      ).map(([area, { prices, count }]) => ({
        area,
        count,
        avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
      }))
    : null;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/">대시보드</Link>
        <span>/</span>
        <span>{complex.name}</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{complex.name}</h1>
          <p className={styles.address}>{complex.address}</p>
          <div className={styles.headerMeta}>
            <Badge variant="default">{complex.buildYear}년 준공</Badge>
            <Badge variant="default">총 {complex.totalUnits}세대</Badge>
            <Badge variant="default">{complex.totalDongs}개동</Badge>
            {complex.isSubwayNear && <Badge variant="info">{complex.subwayInfo}</Badge>}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>현재 등록 매물</span>
          <span className={styles.statValue}>{complex.activeListings}건</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>평균 호가</span>
          <span className={styles.statValue}>{formatPrice(complex.averagePrice)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>최저가</span>
          <span className={`${styles.statValue} ${styles.flash}`}>{formatPrice(complex.lowestPrice)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>중앙값</span>
          <span className={styles.statValue}>{formatPrice(complex.medianPrice)}</span>
        </div>
        {realTransactions && (
          <>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>실거래 건수 (3개월)</span>
              <span className={styles.statValue}>{realTransactions.length}건</span>
              <span className={styles.statBadge}>공공데이터</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>실거래 평균가</span>
              <span className={styles.statValue}>
                {realTransactions.length > 0
                  ? formatPrice(Math.round(realTransactions.reduce((s, t) => s + t.price, 0) / realTransactions.length))
                  : '−'}
              </span>
              <span className={styles.statBadge}>공공데이터</span>
            </div>
          </>
        )}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>주차 비율</span>
          <span className={styles.statValue}>{complex.parkingRatio}대/세대</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>난방 방식</span>
          <span className={styles.statValue}>{complex.heatingType}</span>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.twoCol}>
        {/* 가격 추이 */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>
              {priceTrend ? '최근 6개월 지역 평균 실거래가' : '최근 30일 평균 호가 추이'}
            </h2>
            {priceTrend && <span className={styles.dataLabel}>공공데이터 실거래가</span>}
          </div>
          {trendLoading ? (
            <Skeleton height={240} borderRadius="8px" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendChartData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${(v / 10000).toFixed(0)}억`}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    formatPrice(val),
                    name === 'avg' ? '평균가' : name,
                  ]}
                />
                <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 실거래 산점도 */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>실거래가 분포 (최근 3개월)</h2>
            {realTransactions && <span className={styles.dataLabel}>공공데이터 {realTransactions.length}건</span>}
          </div>
          {txLoading ? (
            <Skeleton height={240} borderRadius="8px" />
          ) : realTxChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={realTxChart} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${(v / 10000).toFixed(0)}억`}
                  domain={['auto', 'auto']}
                />
                <Tooltip formatter={(val: number) => [formatPrice(val), '실거래가']} />
                <Scatter dataKey="price" fill="#2563eb" opacity={0.7} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noData}>최근 3개월 실거래 데이터가 없습니다.</div>
          )}
        </div>
      </div>

      {/* 평형별 실거래 통계 */}
      {areaStats && areaStats.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>평형별 실거래 통계</h2>
            <span className={styles.dataLabel}>공공데이터 최근 3개월</span>
          </div>
          <table className={styles.table}>
            <thead>
              <tr><th>평형</th><th>거래 건수</th><th>평균가</th><th>최저가</th><th>최고가</th></tr>
            </thead>
            <tbody>
              {areaStats.sort((a, b) => a.area.localeCompare(b.area)).map(s => (
                <tr key={s.area}>
                  <td>{s.area}</td>
                  <td>{s.count}건</td>
                  <td className={styles.priceCell}>{formatPrice(s.avgPrice)}</td>
                  <td className={styles.flashPrice}>{formatPrice(s.minPrice)}</td>
                  <td>{formatPrice(s.maxPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 평형별 평균가 바 차트 */}
      {areaStats && areaStats.length > 0 && (
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>평형별 실거래 평균가</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={areaStats} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="area" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 10000).toFixed(0)}억`} />
              <Tooltip formatter={(val: number) => [formatPrice(val), '평균가']} />
              <Bar dataKey="avgPrice" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 최근 실거래 목록 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            최근 실거래가 ({realTransactions?.length ?? complex.recentTransactions.length}건)
          </h2>
          {realTransactions && <span className={styles.dataLabel}>국토교통부 공공 데이터</span>}
        </div>
        {txLoading ? (
          <Skeleton height={200} borderRadius="8px" />
        ) : realTransactions && realTransactions.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr><th>거래일</th><th>층</th><th>면적</th><th>실거래가</th></tr>
            </thead>
            <tbody>
              {realTransactions.slice(0, 20).map(t => (
                <tr key={t.id}>
                  <td>{formatDate(t.dealDate)}</td>
                  <td>{t.floor}층</td>
                  <td>{t.area}㎡</td>
                  <td className={styles.priceCell}>{formatPrice(t.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr><th>거래일</th><th>층</th><th>면적</th><th>실거래가</th></tr>
            </thead>
            <tbody>
              {complex.recentTransactions.map((t, i) => (
                <tr key={i}>
                  <td>{formatDate(t.date)}</td>
                  <td>{t.floor}층</td>
                  <td>{t.area}㎡</td>
                  <td className={styles.priceCell}>{formatPrice(t.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 급매 후보 */}
      {flashListings.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>⚡ 급매 후보 목록</h2>
          <div className={styles.listingGrid}>
            {flashListings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        </div>
      )}

      {/* 전체 매물 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>전체 등록 매물 ({complexListings.length}건)</h2>
        <div className={styles.listingGrid}>
          {complexListings.map(l => <ListingCard key={l.id} listing={l} />)}
        </div>
        {complexListings.length === 0 && <p className={styles.emptyMsg}>등록된 매물이 없습니다.</p>}
      </div>
    </div>
  );
}
