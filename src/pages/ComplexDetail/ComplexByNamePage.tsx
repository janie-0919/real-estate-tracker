/**
 * /complex-detail?name=XXX&district=YYY
 * 실거래 데이터 기반 단지 상세 페이지 (mock 데이터 없이 공공API만 사용)
 */
import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import { useTransactions, usePriceTrend, toChartData } from '@/hooks/useTransactions';
import { useFavoriteComplexes } from '@/hooks/useFavoriteComplexes';
import { SEOUL_DISTRICT_CODE_MAP } from '@/data/districts';
import { formatPrice, formatDate, formatDealType } from '@/utils/format';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './ComplexByNamePage.module.scss';

const PAGE_SIZE = 20;

export default function ComplexByNamePage() {
  const [searchParams] = useSearchParams();
  const name     = searchParams.get('name') ?? '';
  const district = searchParams.get('district') ?? '';
  const districtCode = district ? SEOUL_DISTRICT_CODE_MAP[district] : undefined;

  const [page, setPage] = useState(1);
  const [dealFilter, setDealFilter] = useState<'all' | 'sale' | 'lease' | 'monthly'>('all');
  const { toggle: toggleFav, isFavorite } = useFavoriteComplexes();
  const faved = isFavorite(name, district);

  const { data: transactions, isLoading: txLoading } = useTransactions({
    district,
    districtCode,
    complex: name,
    dealType: 'all',
    enabled: !!district && !!name,
  });

  const { data: priceTrend, isLoading: trendLoading } = usePriceTrend({
    district,
    districtCode,
    months: 6,
    enabled: !!district,
  });

  const filtered = useMemo(() => {
    if (!transactions) return [];
    if (dealFilter === 'all') return transactions;
    return transactions.filter(t => t.dealType === dealFilter);
  }, [transactions, dealFilter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.dealDate.localeCompare(a.dealDate)),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 요약 통계
  const saleOnly = transactions?.filter(t => t.dealType === 'sale') ?? [];
  const avgPrice = saleOnly.length
    ? Math.round(saleOnly.reduce((s, t) => s + t.price, 0) / saleOnly.length)
    : null;
  const maxPrice = saleOnly.length ? Math.max(...saleOnly.map(t => t.price)) : null;
  const minPrice = saleOnly.length ? Math.min(...saleOnly.map(t => t.price)) : null;

  // 산점도 차트
  const scatterData = toChartData(saleOnly);

  // 지역 가격 추이 차트
  const trendData = priceTrend?.map(d => ({
    date: d.yearMonth.slice(4),  // MMYYYY → MM
    avg: d.avgPrice,
  })) ?? [];

  if (!name || !district) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>단지명 또는 지역 정보가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/">대시보드</Link>
        <span>/</span>
        <Link to={`/listings?district=${encodeURIComponent(district)}`}>{district}</Link>
        <span>/</span>
        <span>{name}</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}><span>{name}</span><button
              className={`${styles.favBtn} ${faved ? styles.favBtnActive : ''}`}
              onClick={() => toggleFav(name, district)}
              title={faved ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={faved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            {faved ? '즐겨찾기 해제' : '즐겨찾기'}
          </button></h1>
          <p className={styles.address}>{district}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.dataLabel}>국토교통부 공공 데이터</span>
        </div>
      </div>

      {/* 요약 통계 */}
      {txLoading ? (
        <div className={styles.statsGrid}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={80} borderRadius="12px" />)}
        </div>
      ) : transactions && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>총 거래 건수</span>
            <span className={styles.statValue}>{transactions.length}건</span>
            <span className={styles.statSub}>최근 3개월</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>매매 평균가</span>
            <span className={styles.statValue}>{avgPrice ? formatPrice(avgPrice) : '−'}</span>
            <span className={styles.statSub}>{saleOnly.length}건 기준</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>매매 최저가</span>
            <span className={`${styles.statValue} ${styles.priceDown}`}>
              {minPrice ? formatPrice(minPrice) : '−'}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>매매 최고가</span>
            <span className={styles.statValue}>{maxPrice ? formatPrice(maxPrice) : '−'}</span>
          </div>
        </div>
      )}

      {/* 차트 2열 */}
      {!txLoading && !trendLoading && (
        <div className={styles.twoCol}>
          {/* 실거래 산점도 */}
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>매매 실거래가 분포</h2>
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={scatterData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
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
              <div className={styles.noData}>매매 데이터가 없습니다</div>
            )}
          </div>

          {/* 지역 월별 평균가 추이 */}
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>{district} 월별 평균 실거래가</h2>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={v => `${(v / 10000).toFixed(0)}억`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip formatter={(val: number) => [formatPrice(val), '지역 평균가']} />
                  <Line type="monotone" dataKey="avg" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noData}>추이 데이터가 없습니다</div>
            )}
          </div>
        </div>
      )}

      {/* 거래 내역 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>거래 내역</h2>
          {/* 거래유형 필터 */}
          <div className={styles.dealFilter}>
            {(['all', 'sale', 'lease', 'monthly'] as const).map(type => (
              <button
                key={type}
                className={`${styles.dealBtn} ${dealFilter === type ? styles.active : ''}`}
                onClick={() => { setDealFilter(type); setPage(1); }}
              >
                {type === 'all' ? '전체' : type === 'sale' ? '매매' : type === 'lease' ? '전세' : '월세'}
              </button>
            ))}
          </div>
        </div>

        {txLoading ? (
          <Skeleton height={200} borderRadius="12px" />
        ) : sorted.length === 0 ? (
          <p className={styles.empty}>조건에 맞는 거래 내역이 없습니다.</p>
        ) : (
          <>
            {/* 데스크톱 테이블 */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>거래유형</th>
                    <th>거래일</th>
                    <th>면적(㎡)</th>
                    <th>층</th>
                    <th>가격</th>
                    <th>법정동</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((t, i) => (
                    <tr key={`${t.id}_${i}`}>
                      <td>
                        <Badge
                          variant={t.dealType === 'sale' ? 'primary' : t.dealType === 'lease' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {formatDealType(t.dealType)}
                        </Badge>
                      </td>
                      <td>{formatDate(t.dealDate)}</td>
                      <td>{t.area.toFixed(1)}</td>
                      <td>{t.floor}층</td>
                      <td className={styles.priceCell}>
                        {t.dealType === 'monthly' && t.monthlyRent
                          ? `${formatPrice(t.price)} / 월 ${t.monthlyRent.toLocaleString()}만`
                          : formatPrice(t.price)}
                      </td>
                      <td>{t.neighborhood}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 리스트 */}
            <div className={styles.mobileList}>
              {pageItems.map((t, i) => (
                <div key={`m_${t.id}_${i}`} className={styles.mobileItem}>
                  <div className={styles.mobileTop}>
                    <Badge
                      variant={t.dealType === 'sale' ? 'primary' : t.dealType === 'lease' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {formatDealType(t.dealType)}
                    </Badge>
                    <span className={styles.mobileMeta}>{t.area.toFixed(1)}㎡ · {t.floor}층</span>
                  </div>
                  <div className={styles.mobilePrice}>
                    {t.dealType === 'monthly' && t.monthlyRent
                      ? `${formatPrice(t.price)} / 월 ${t.monthlyRent.toLocaleString()}만`
                      : formatPrice(t.price)}
                  </div>
                  <div className={styles.mobileDate}>{formatDate(t.dealDate)} · {t.neighborhood}</div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ←
                </button>
                <span className={styles.pageInfo}>{page} / {totalPages}</span>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
