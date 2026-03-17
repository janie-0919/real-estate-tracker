import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { parseSearchQuery, buildListingsUrl } from '@/utils/search';
import { useDistrictSummary, useNationalStats, useTopComplexes, useTransactions } from '@/hooks/useTransactions';
import TransactionCard from '@/components/listings/TransactionCard';
import { formatPrice } from '@/utils/format';
import styles from './HomePage.module.scss';

const REGION_DEFAULT_COUNT = 5;

export default function HomePage() {
  const [searchValue, setSearchValue] = useState('');
  const [showAllRegions, setShowAllRegions] = useState(false);
  const navigate = useNavigate();

  // 서울 지역별 요약 (stat cards + region table)
  const { data: districtSummary, isLoading: summaryLoading } = useDistrictSummary({ sido: '서울' });

  // 전국 통계
  const { data: nationalStats, isLoading: nationalLoading } = useNationalStats();

  // 서울 전체 최고가 단지 (전국 25개 구 → 전국 250개 구 통합)
  const { data: topComplexes, isLoading: topStatsLoading } = useTopComplexes({ months: 1, limit: 4 });

  // 최근 실거래: 강남·마포·용산·성동
  const { data: gangnamTx,   isLoading: gangnamLoading }   = useTransactions({ district: '서울 강남구',  dealType: 'sale' });
  const { data: mapoTx,      isLoading: mapoLoading }      = useTransactions({ district: '서울 마포구',  dealType: 'sale' });
  const { data: yongsanTx,   isLoading: yongsanLoading }   = useTransactions({ district: '서울 용산구',  dealType: 'sale' });
  const { data: seongdongTx, isLoading: seongdongLoading } = useTransactions({ district: '서울 성동구',  dealType: 'sale' });

  // ── 서울 통계 계산 ──
  const seoulTotalTx = districtSummary?.reduce((sum, d) => sum + d.count, 0) ?? 0;
  const seoulDistrictsWithData = districtSummary?.filter(d => d.avgPrice > 0) ?? [];
  const seoulAvgPrice = seoulDistrictsWithData.length > 0
    ? Math.round(seoulDistrictsWithData.reduce((sum, d) => sum + d.avgPrice, 0) / seoulDistrictsWithData.length)
    : 0;
  const seoulMaxPrice = districtSummary?.length ? Math.max(...districtSummary.map(d => d.maxPrice)) : 0;
  const seoulTopDistrict = districtSummary?.slice().sort((a, b) => b.count - a.count)[0];
  const seoulCheapestDistrict = seoulDistrictsWithData.slice().sort((a, b) => a.avgPrice - b.avgPrice)[0];

  // ── 8개 통계 카드 ──
  const STAT_CARDS: { label: string; value: string; sub: string; category: 'seoul' | 'national' }[] = [
    {
      category: 'seoul',
      label: '이번달 서울 실거래',
      value: summaryLoading ? '...' : `${seoulTotalTx.toLocaleString()}건`,
      sub: '국토부 실거래 데이터',
    },
    {
      category: 'national',
      label: '이번달 전국 실거래',
      value: nationalLoading ? '...' : (nationalStats ? `${nationalStats.totalCount.toLocaleString()}건` : '-'),
      sub: '전국 시군구 집계',
    },
    {
      category: 'seoul',
      label: '서울 평균 실거래가',
      value: summaryLoading ? '...' : (seoulAvgPrice > 0 ? formatPrice(seoulAvgPrice) : '-'),
      sub: '매매 기준 (최근 1개월)',
    },
    {
      category: 'national',
      label: '전국 평균 실거래가',
      value: nationalLoading ? '...' : (nationalStats?.avgPrice ? formatPrice(nationalStats.avgPrice) : '-'),
      sub: '매매 기준 (최근 1개월)',
    },
    {
      category: 'seoul',
      label: '서울 최고 실거래가',
      value: summaryLoading ? '...' : (seoulMaxPrice > 0 ? formatPrice(seoulMaxPrice) : '-'),
      sub: '서울 전체 단지 기준',
    },
    {
      category: 'national',
      label: '전국 최고 실거래가',
      value: nationalLoading ? '...' : (nationalStats?.maxPrice ? formatPrice(nationalStats.maxPrice) : '-'),
      sub: '전국 시군구 기준',
    },
    {
      category: 'seoul',
      label: '서울 거래 활발 지역',
      value: summaryLoading ? '...' : (seoulTopDistrict ? seoulTopDistrict.district.replace('서울 ', '') : '-'),
      sub: seoulTopDistrict ? `${seoulTopDistrict.count}건 거래` : '집계 중',
    },
    {
      category: 'national',
      label: '전국 거래 활발 지역',
      value: nationalLoading ? '...' : (nationalStats?.topDistrict?.district ?? '-'),
      sub: nationalStats?.topDistrict ? `${nationalStats.topDistrict.count}건 거래` : '집계 중',
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    const { district, query } = parseSearchQuery(searchValue.trim());
    navigate(buildListingsUrl(district, query));
  };

  return (
    <div className={styles.page}>
      {/* Hero Search */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            부동산 매물을 스마트하게<br />
            <span className={styles.highlight}>모니터링</span>하세요
          </h1>
          <p className={styles.heroSub}>
            실시간 가격 변동 추적 · 실거래가 비교 · 급매 탐지 · 맞춤 알림
          </p>
          <form className={styles.heroSearch} onSubmit={handleSearch}>
            <div className={styles.searchBox}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="search"
                placeholder="단지명, 지역, 주소를 검색하세요 (예: 래미안 원베일리, 서초구)"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
              />
              <button type="submit">검색</button>
            </div>
          </form>
          <div className={styles.quickLinks}>
            <span>빠른 검색:</span>
            {[
              '서울 강남구', '서울 서초구', '서울 마포구', '서울 성동구',
              '서울 용산구', '서울 송파구', '서울 영등포구', '서울 노원구',
            ].map(d => (
              <Link key={d} to={`/listings?district=${encodeURIComponent(d)}`} className={styles.quickLink}>
                {d.replace('서울 ', '')}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stat Cards */}
      <section className={styles.section}>
        <div className={styles.statGrid}>
          {STAT_CARDS.map(stat => (
            <div key={stat.label} className={`${styles.statCard} ${stat.category === 'national' ? styles.statCardNational : ''}`}>
              <span className={`${styles.statCategory} ${stat.category === 'national' ? styles.statCategoryNational : ''}`}>
                {stat.category === 'national' ? '전국' : '서울'}
              </span>
              <p className={styles.statLabel}>{stat.label}</p>
              <p className={styles.statValue}>{stat.value}</p>
              <p className={styles.statChange}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Region Summary */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>지역별 현황</h2>
          <Link to="/listings" className={styles.seeAll}>전체 보기 →</Link>
        </div>
        <div className={styles.regionTable}>
          {summaryLoading ? (
            <p style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>데이터 불러오는 중...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>지역</th>
                  <th>거래 건수</th>
                  <th>평균 실거래가</th>
                  <th>최저가</th>
                  <th>최고가</th>
                </tr>
              </thead>
              <tbody>
                {(showAllRegions
                  ? districtSummary ?? []
                  : (districtSummary ?? []).slice(0, REGION_DEFAULT_COUNT)
                ).map(r => (
                  <tr key={r.district}>
                    <td>
                      <Link to={`/listings?district=${encodeURIComponent(r.district)}`} className={styles.districtLink}>
                        {r.district}
                      </Link>
                    </td>
                    <td>{r.count > 0 ? `${r.count}건` : '-'}</td>
                    <td>{r.avgPrice > 0 ? formatPrice(r.avgPrice) : '-'}</td>
                    <td>{r.minPrice > 0 ? formatPrice(r.minPrice) : '-'}</td>
                    <td>{r.maxPrice > 0 ? formatPrice(r.maxPrice) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(districtSummary ?? []).length > REGION_DEFAULT_COUNT && (
            <button
              className={styles.showMoreBtn}
              onClick={() => setShowAllRegions(prev => !prev)}
            >
              {showAllRegions
                ? '▲ 접기'
                : `▼ 더보기 (+${(districtSummary?.length ?? 0) - REGION_DEFAULT_COUNT}개 지역)`}
            </button>
          )}
        </div>
      </section>

      {/* 서울 최고가 실거래 단지 (전체) */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.upIcon}>🏆</span> 서울 최고가 실거래 단지 TOP 4
          </h2>
          {/*<span className={styles.dataLabel}>강남·서초·용산·송파 합산</span>*/}
        </div>
        {topStatsLoading ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>데이터 불러오는 중...</p>
        ) : topComplexes.length > 0 ? (
          <div className={styles.listingGrid}>
            {topComplexes.map(c => (
              <Link
                key={`${c.complexName}_${c.neighborhood}`}
                to={`/complex-detail?name=${encodeURIComponent(c.complexName)}&district=${encodeURIComponent(c.district)}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>{c.district.replace('서울 ', '')} · {c.neighborhood}</p>
                  <p className={styles.statValue} style={{ fontSize: '1rem' }}>{c.complexName}</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1d4ed8', margin: '0.5rem 0 0.25rem' }}>
                    최고 {formatPrice(c.maxPrice)}
                  </p>
                  <p className={styles.statChange}>
                    평균 {formatPrice(c.avgPrice)} · {c.transactionCount}건
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>데이터가 없습니다.</p>
        )}
      </section>

      {/* 강남구 최근 실거래 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.upIcon}>🏠</span> 강남구 최근 실거래
          </h2>
          <Link to="/listings?district=서울 강남구" className={styles.seeAll}>더 보기 →</Link>
        </div>
        {gangnamLoading ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>데이터 불러오는 중...</p>
        ) : (gangnamTx?.slice(0, 4) ?? []).length > 0 ? (
          <div className={styles.listingGrid}>
            {gangnamTx!.slice(0, 4).map((t, idx) => (
              <TransactionCard key={`${t.id}_${idx}`} transaction={t} />
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>데이터가 없습니다.</p>
        )}
      </section>

      {/* 마포구 최근 실거래 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.flashIcon}>🏙️</span> 마포구 최근 실거래
          </h2>
          <Link to="/listings?district=서울 마포구" className={styles.seeAll}>더 보기 →</Link>
        </div>
        {mapoLoading ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>데이터 불러오는 중...</p>
        ) : (mapoTx?.slice(0, 4) ?? []).length > 0 ? (
          <div className={styles.listingGrid}>
            {mapoTx!.slice(0, 4).map((t, idx) => (
              <TransactionCard key={`${t.id}_${idx}`} transaction={t} />
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>데이터가 없습니다.</p>
        )}
      </section>

      {/* 용산구 최근 실거래 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.downIcon}>🏢</span> 용산구 최근 실거래
          </h2>
          <Link to="/listings?district=서울 용산구" className={styles.seeAll}>더 보기 →</Link>
        </div>
        {yongsanLoading ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>데이터 불러오는 중...</p>
        ) : (yongsanTx?.slice(0, 4) ?? []).length > 0 ? (
          <div className={styles.listingGrid}>
            {yongsanTx!.slice(0, 4).map((t, idx) => (
              <TransactionCard key={`${t.id}_${idx}`} transaction={t} />
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>데이터가 없습니다.</p>
        )}
      </section>

      {/* 성동구 최근 실거래 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.flashIcon}>🌆</span> 성동구 최근 실거래
          </h2>
          <Link to="/listings?district=서울 성동구" className={styles.seeAll}>더 보기 →</Link>
        </div>
        {seongdongLoading ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>데이터 불러오는 중...</p>
        ) : (seongdongTx?.slice(0, 4) ?? []).length > 0 ? (
          <div className={styles.listingGrid}>
            {seongdongTx!.slice(0, 4).map((t, idx) => (
              <TransactionCard key={`${t.id}_${idx}`} transaction={t} />
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>데이터가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
