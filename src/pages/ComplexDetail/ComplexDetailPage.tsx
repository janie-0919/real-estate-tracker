import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { mockComplexes, mockListings } from '@/data/mockListings';
import { formatPrice, formatDate, formatDateShort } from '@/utils/format';
import ListingCard from '@/components/listings/ListingCard';
import Badge from '@/components/ui/Badge';
import NotFoundPage from '@/pages/NotFound/NotFoundPage';
import styles from './ComplexDetailPage.module.scss';

export default function ComplexDetailPage() {
  const { id } = useParams<{ id: string }>();
  const complex = mockComplexes.find(c => c.id === id);

  if (!complex) return <NotFoundPage />;

  const complexListings = mockListings.filter(l => l.complexId === id);
  const flashListings = complexListings.filter(l => (l.deviationFromActual ?? 0) < 0);

  const priceChartData = complex.priceHistory30d.map(d => ({
    date: formatDateShort(d.date),
    avg: d.avgPrice,
  }));

  const areaChartData = complex.areaDistribution.map(d => ({
    area: `${d.area}㎡`,
    count: d.count,
    avgPrice: d.avgPrice,
  }));

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
        <div className={styles.statCard}>
          <span className={styles.statLabel}>주차 비율</span>
          <span className={styles.statValue}>{complex.parkingRatio}대/세대</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>난방 방식</span>
          <span className={styles.statValue}>{complex.heatingType}</span>
        </div>
      </div>

      <div className={styles.twoCol}>
        {/* 30-day price trend */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>최근 30일 평균 호가 추이</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={priceChartData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={v => `${(v / 10000).toFixed(0)}억`}
                domain={['auto', 'auto']}
              />
              <Tooltip formatter={(val: number) => [formatPrice(val), '평균 호가']} />
              <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Area distribution */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>평형별 매물 분포</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={areaChartData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="area" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(val: number, name: string) =>
                  name === 'count' ? [`${val}건`, '매물 수'] : [formatPrice(val), '평균가']
                }
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Area distribution table */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>평형별 최저가</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>평형</th>
              <th>현재 매물 수</th>
              <th>평균 호가</th>
            </tr>
          </thead>
          <tbody>
            {complex.areaDistribution.map(d => (
              <tr key={d.area}>
                <td>{d.area}㎡ ({Math.round(d.area / 3.3058)}평)</td>
                <td>{d.count}건</td>
                <td className={styles.priceCell}>{formatPrice(d.avgPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent transactions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>최근 실거래가</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>거래일</th>
              <th>층</th>
              <th>면적</th>
              <th>실거래가</th>
            </tr>
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
      </div>

      {/* Flash listings */}
      {flashListings.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>⚡ 급매 후보 목록</h2>
          <div className={styles.listingGrid}>
            {flashListings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        </div>
      )}

      {/* All listings */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>전체 등록 매물 ({complexListings.length}건)</h2>
        </div>
        <div className={styles.listingGrid}>
          {complexListings.map(l => <ListingCard key={l.id} listing={l} />)}
        </div>
        {complexListings.length === 0 && (
          <p className={styles.emptyMsg}>등록된 매물이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
