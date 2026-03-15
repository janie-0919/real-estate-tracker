import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Scatter, ComposedChart,
} from 'recharts';
import { mockListings, mockComplexes } from '@/data/mockListings';
import {
  formatPrice, formatArea, formatDate, formatDateShort, formatBuildYear,
  formatDealType, formatDeviation, formatPriceChange, getDeviationColor,
} from '@/utils/format';
import { useTransactions, useDeviation, toChartData } from '@/hooks/useTransactions';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import NotFoundPage from '@/pages/NotFound/NotFoundPage';
import styles from './ListingDetailPage.module.scss';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'comparison' | 'transaction' | 'log'>('history');

  const listing = mockListings.find(l => l.id === id);
  if (!listing) return <NotFoundPage />;

  const complex = mockComplexes.find(c => c.id === listing.complexId);
  const sameComplexListings = mockListings.filter(
    l => l.complexId === listing.complexId && l.id !== listing.id && l.area === listing.area,
  );

  // ── 실거래가 (공공 API) ─────────────────────────────────────────
  const { data: realTransactions, isLoading: txLoading } = useTransactions({
    district: listing.district,
    complex: listing.complexName,
    area: listing.area,
    dealType: 'sale',
    enabled: activeTab === 'transaction',
  });

  // ── 괴리율 (실거래 기반 자동 계산) ──────────────────────────────
  const { data: deviationData, isLoading: devLoading } = useDeviation({
    district: listing.district,
    complex: listing.complexName,
    area: listing.area,
    listingPrice: listing.price,
  });

  // 괴리율: 실데이터 우선, 없으면 mock
  const deviationPct  = deviationData?.deviationPct  ?? listing.deviationFromActual ?? 0;
  const deviationLabel = deviationData?.label         ?? listing.deviationLabel ?? '';
  const actualAvgPrice = deviationData?.actualAvgPrice ?? 0;
  const deviationColor = getDeviationColor(deviationPct);

  // 실거래 차트 데이터
  const realTxChart = realTransactions ? toChartData(realTransactions) : [];

  // 호가 이력 차트
  const priceHistoryChart = listing.priceHistory.map(h => ({
    date: formatDateShort(h.date),
    price: h.price,
    note: h.note,
  }));

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/">대시보드</Link>
        <span>/</span>
        <Link to="/listings">매물 목록</Link>
        <span>/</span>
        <span>{listing.complexName}</span>
      </nav>

      <div className={styles.layout}>
        {/* Left: Main content */}
        <div className={styles.main}>
          {/* Image */}
          <div className={styles.imageBox}>
            <img
              src={listing.thumbnailUrl}
              alt={listing.complexName}
              onError={e => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"%3E%3Crect fill="%23e5e7eb" width="800" height="400"/%3E%3Ctext x="400" y="200" text-anchor="middle" dominant-baseline="middle" fill="%239ca3af" font-size="64"%3E🏠%3C/text%3E%3C/svg%3E';
              }}
            />
            <div className={styles.imageBadges}>
              <span className={`${styles.dealBadge} ${styles[`deal-${listing.dealType}`]}`}>
                {formatDealType(listing.dealType)}
              </span>
              {listing.isSuspectedDuplicate && <Badge variant="danger">중복의심</Badge>}
              {listing.isReRegistered && <Badge variant="warning">재등록</Badge>}
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {[
              { key: 'history', label: '가격 이력' },
              { key: 'comparison', label: '단지 비교' },
              { key: 'transaction', label: '실거래가' },
              { key: 'log', label: '등록 변화' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`${styles.tab} ${activeTab === tab.key ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className={styles.tabContent}>
            {activeTab === 'history' && (
              <div className={styles.historyTab}>
                <div className={styles.chartArea}>
                  <h3 className={styles.chartTitle}>호가 이력</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={priceHistoryChart} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={v => `${(v / 10000).toFixed(0)}억`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip formatter={(val: number) => [formatPrice(val), '호가']} />
                      {actualAvgPrice > 0 && (
                        <ReferenceLine
                          y={actualAvgPrice}
                          stroke="#2563eb"
                          strokeDasharray="5 5"
                          label={{ value: '실거래 평균', position: 'right', fontSize: 11, fill: '#2563eb' }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        dot={{ r: 5, fill: '#ef4444' }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <table className={styles.historyTable}>
                  <thead>
                    <tr><th>날짜</th><th>가격</th><th>변동</th><th>비고</th></tr>
                  </thead>
                  <tbody>
                    {[...listing.priceHistory].reverse().map((h, i, arr) => {
                      const prev = arr[i + 1];
                      const change = prev ? h.price - prev.price : 0;
                      return (
                        <tr key={h.date}>
                          <td>{formatDate(h.date)}</td>
                          <td className={styles.priceCell}>{formatPrice(h.price)}</td>
                          <td className={change > 0 ? styles.up : change < 0 ? styles.down : ''}>
                            {change !== 0 ? formatPriceChange(change) : '−'}
                          </td>
                          <td className={styles.noteCell}>{h.note ?? '−'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className={styles.historyStats}>
                  <div className={styles.historyStat}>
                    <span className={styles.statLabel}>최초 등록가</span>
                    <span className={styles.statVal}>{formatPrice(listing.priceHistory[0].price)}</span>
                  </div>
                  <div className={styles.historyStat}>
                    <span className={styles.statLabel}>인상 횟수</span>
                    <span className={`${styles.statVal} ${styles.up}`}>{listing.priceRiseCount}회</span>
                  </div>
                  <div className={styles.historyStat}>
                    <span className={styles.statLabel}>인하 횟수</span>
                    <span className={`${styles.statVal} ${styles.down}`}>{listing.priceDropCount}회</span>
                  </div>
                  <div className={styles.historyStat}>
                    <span className={styles.statLabel}>마지막 변동</span>
                    <span className={styles.statVal}>{formatDate(listing.updatedAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'comparison' && (
              <div className={styles.comparisonTab}>
                <div className={styles.comparisonSummary}>
                  <div className={styles.compStat}>
                    <span className={styles.statLabel}>동일 평형 매물 수</span>
                    <span className={styles.statVal}>{sameComplexListings.length + 1}건</span>
                  </div>
                  <div className={styles.compStat}>
                    <span className={styles.statLabel}>최저가</span>
                    <span className={styles.statVal}>
                      {formatPrice(Math.min(...[listing, ...sameComplexListings].map(l => l.price)))}
                    </span>
                  </div>
                  <div className={styles.compStat}>
                    <span className={styles.statLabel}>현재 매물</span>
                    <span className={`${styles.statVal} ${styles.highlight}`}>{formatPrice(listing.price)}</span>
                  </div>
                  {complex && (
                    <div className={styles.compStat}>
                      <span className={styles.statLabel}>단지 평균 대비</span>
                      <span className={`${styles.statVal} ${listing.price > complex.averagePrice ? styles.up : styles.down}`}>
                        {listing.price > complex.averagePrice ? '+' : ''}
                        {(((listing.price - complex.averagePrice) / complex.averagePrice) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {sameComplexListings.length > 0 ? (
                  <table className={styles.compTable}>
                    <thead>
                      <tr><th>층</th><th>방향</th><th>가격</th><th>변동</th><th>판단</th></tr>
                    </thead>
                    <tbody>
                      <tr className={styles.currentRow}>
                        <td>{listing.floor}층 <Badge variant="primary" size="sm">현재</Badge></td>
                        <td>{listing.direction}</td>
                        <td className={styles.priceCell}>{formatPrice(listing.price)}</td>
                        <td className={listing.priceChangeDirection === 'up' ? styles.up : listing.priceChangeDirection === 'down' ? styles.down : ''}>
                          {listing.priceChange ? formatPriceChange(listing.priceChange) : '−'}
                        </td>
                        <td>{deviationLabel}</td>
                      </tr>
                      {sameComplexListings.map(l => (
                        <tr key={l.id}>
                          <td><Link to={`/listings/${l.id}`} className={styles.tableLink}>{l.floor}층</Link></td>
                          <td>{l.direction}</td>
                          <td className={styles.priceCell}>{formatPrice(l.price)}</td>
                          <td className={l.priceChangeDirection === 'up' ? styles.up : l.priceChangeDirection === 'down' ? styles.down : ''}>
                            {l.priceChange ? formatPriceChange(l.priceChange) : '−'}
                          </td>
                          <td>{l.deviationLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className={styles.emptyMsg}>동일 평형의 다른 매물이 없습니다.</p>
                )}
              </div>
            )}

            {activeTab === 'transaction' && (
              <div className={styles.transactionTab}>
                {txLoading ? (
                  <div className={styles.loadingArea}>
                    <Skeleton height={280} borderRadius="8px" />
                    <Skeleton height={20} width="60%" />
                    <Skeleton height={20} width="40%" />
                  </div>
                ) : (
                  <>
                    {/* 실거래가 차트 */}
                    <div className={styles.chartArea}>
                      <div className={styles.chartTitleRow}>
                        <h3 className={styles.chartTitle}>
                          실거래가 ({listing.area}㎡ 기준, 최근 3개월)
                        </h3>
                        {realTransactions && (
                          <span className={styles.dataSource}>
                            공공데이터포털 국토교통부 실거래가 · {realTransactions.length}건
                          </span>
                        )}
                      </div>

                      {realTxChart.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <ComposedChart data={realTxChart} margin={{ top: 16, right: 32, bottom: 8, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              tickFormatter={v => `${(v / 10000).toFixed(0)}억`}
                              domain={['auto', 'auto']}
                            />
                            <Tooltip
                              formatter={(val: number) => [formatPrice(val), '실거래가']}
                              labelFormatter={label => `날짜: ${label}`}
                            />
                            <ReferenceLine
                              y={listing.price}
                              stroke="#ef4444"
                              strokeDasharray="5 5"
                              label={{ value: '현재 호가', position: 'insideTopRight', fontSize: 11, fill: '#ef4444' }}
                            />
                            {actualAvgPrice > 0 && (
                              <ReferenceLine
                                y={actualAvgPrice}
                                stroke="#6b7280"
                                strokeDasharray="3 3"
                                label={{ value: '실거래 평균', position: 'insideBottomRight', fontSize: 11, fill: '#6b7280' }}
                              />
                            )}
                            <Scatter dataKey="price" fill="#2563eb" />
                            <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={{ r: 5 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className={styles.noDataChart}>
                          <p>최근 3개월 해당 평형 실거래 데이터가 없습니다.</p>
                        </div>
                      )}
                    </div>

                    {/* 괴리율 요약 */}
                    {devLoading ? (
                      <Skeleton height={80} borderRadius="8px" />
                    ) : (
                      <div
                        className={styles.deviationBox}
                        style={{ borderColor: deviationColor + '40', background: deviationColor + '08' }}
                      >
                        <div className={styles.devItem}>
                          <span>실거래 평균</span>
                          <strong>{actualAvgPrice > 0 ? formatPrice(actualAvgPrice) : '−'}</strong>
                        </div>
                        <div className={styles.devItem}>
                          <span>현재 호가</span>
                          <strong>{formatPrice(listing.price)}</strong>
                        </div>
                        <div className={styles.devItem}>
                          <span>괴리율</span>
                          <strong style={{ color: deviationColor }}>{formatDeviation(deviationPct)}</strong>
                        </div>
                        <div className={styles.devItem}>
                          <span>판단</span>
                          <strong style={{ color: deviationColor }}>{deviationLabel}</strong>
                        </div>
                      </div>
                    )}

                    {/* 실거래 목록 */}
                    {realTransactions && realTransactions.length > 0 && (
                      <table className={styles.compTable}>
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
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'log' && (
              <div className={styles.logTab}>
                <div className={styles.timeline}>
                  {[...listing.priceHistory].reverse().map((h, i) => (
                    <div key={h.date} className={styles.timelineItem}>
                      <div className={styles.timelineDot} />
                      {i < listing.priceHistory.length - 1 && <div className={styles.timelineLine} />}
                      <div className={styles.timelineContent}>
                        <p className={styles.timelineDate}>{formatDate(h.date)}</p>
                        <p className={styles.timelineNote}>{h.note}</p>
                        <p className={styles.timelinePrice}>{formatPrice(h.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.warningFlags}>
                  {listing.isSuspectedDuplicate && (
                    <div className={styles.flag}>
                      <Badge variant="danger">중복 의심</Badge>
                      <p>동일 매물이 여러 중개사를 통해 등록되었을 가능성이 있습니다.</p>
                    </div>
                  )}
                  {listing.isReRegistered && (
                    <div className={styles.flag}>
                      <Badge variant="warning">재등록</Badge>
                      <p>이 매물은 삭제 후 재등록된 이력이 있습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Info panel */}
        <aside className={styles.sidebar}>
          <div className={styles.infoCard}>
            <div className={styles.complexHeader}>
              <h1 className={styles.complexName}>{listing.complexName}</h1>
              <p className={styles.address}>{listing.address}</p>
            </div>

            <div className={styles.priceSection}>
              <p className={styles.priceLabel}>{formatDealType(listing.dealType)}</p>
              <p className={styles.priceMain}>
                {listing.dealType === 'monthly'
                  ? `${formatPrice(listing.depositPrice ?? 0)} / ${listing.monthlyRent}만`
                  : formatPrice(listing.price)}
              </p>
              {listing.priceChange !== 0 && listing.priceChange !== undefined && (
                <p className={`${styles.priceChange} ${listing.priceChangeDirection === 'up' ? styles.up : styles.down}`}>
                  {listing.priceChangeDirection === 'up' ? '▲' : '▼'} {formatPriceChange(listing.priceChange)} 전일 대비
                </p>
              )}
            </div>

            {/* 괴리율 (실데이터 기반) */}
            {devLoading ? (
              <Skeleton height={48} borderRadius="8px" />
            ) : (
              <div
                className={styles.deviationBar}
                style={{ borderColor: deviationColor + '40', background: deviationColor + '0a' }}
              >
                <span style={{ color: deviationColor, fontWeight: 700 }}>
                  실거래 대비 {formatDeviation(deviationPct)}
                </span>
                <span className={styles.deviationLabel}>{deviationLabel}</span>
              </div>
            )}

            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>면적</span>
                <span>{formatArea(listing.area)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>층</span>
                <span>{listing.floor}/{listing.totalFloors}층</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>방향</span>
                <span>{listing.direction}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>준공</span>
                <span>{formatBuildYear(listing.buildYear)}</span>
              </div>
              {listing.renovated && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>리모델링</span>
                  <Badge variant="success" size="sm">완료</Badge>
                </div>
              )}
              {listing.isSubwayNear && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>역세권</span>
                  <span>{listing.subwayLine} {listing.subwayStation} {listing.subwayDistance}m</span>
                </div>
              )}
            </div>

            <div className={styles.tags}>
              {listing.tags.map(tag => <Badge key={tag} variant="default">{tag}</Badge>)}
            </div>

            <div className={styles.agentBox}>
              <p className={styles.agentTitle}>담당 중개사</p>
              <p className={styles.agentName}>{listing.agent.name}</p>
              <p className={styles.agentAgency}>{listing.agent.agency}</p>
            </div>

            <div className={styles.actions}>
              <Button
                variant={isFavorited ? 'secondary' : 'primary'}
                size="lg"
                onClick={() => setIsFavorited(!isFavorited)}
                leftIcon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                }
              >
                {isFavorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/alerts')}
                leftIcon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                }
              >
                알림 설정
              </Button>
            </div>

            {complex && (
              <Link to={`/complex/${complex.id}`} className={styles.complexLink}>
                단지 전체 정보 보기 →
              </Link>
            )}

            <div className={styles.metaInfo}>
              <p>등록일: {formatDate(listing.registeredAt)}</p>
              <p>업데이트: {formatDate(listing.updatedAt)}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
