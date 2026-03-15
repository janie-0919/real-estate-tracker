import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TOP_RISING_LISTINGS,
  TOP_DROPPING_LISTINGS,
  FLASH_LISTINGS,
  NEW_LISTINGS,
  mockRegionSummaries,
} from '@/data/mockListings';
import ListingCard from '@/components/listings/ListingCard';
import styles from './HomePage.module.scss';

const STAT_CARDS = [
  { label: '오늘 신규 매물', value: '160건', change: 12, changeLabel: '어제 대비' },
  { label: '가격 인하 매물', value: '43건', change: -8, changeLabel: '어제 대비' },
  { label: '급매 추정 매물', value: '19건', change: 5, changeLabel: '어제 대비' },
  { label: '실거래 근접 매물', value: '87건', change: 3, changeLabel: '어제 대비' },
];

export default function HomePage() {
  const [searchValue, setSearchValue] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/listings?q=${encodeURIComponent(searchValue.trim())}`);
    }
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
            <div key={stat.label} className={styles.statCard}>
              <p className={styles.statLabel}>{stat.label}</p>
              <p className={styles.statValue}>{stat.value}</p>
              <p className={`${styles.statChange} ${stat.change > 0 ? styles.positive : styles.negative}`}>
                {stat.change > 0 ? '▲' : '▼'} {Math.abs(stat.change)}건 {stat.changeLabel}
              </p>
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
          <table>
            <thead>
              <tr>
                <th>지역</th>
                <th>신규 매물</th>
                <th>평균 호가 변화</th>
                <th>급매 추정</th>
                <th>저괴리 매물</th>
              </tr>
            </thead>
            <tbody>
              {mockRegionSummaries.map(r => (
                <tr key={r.district}>
                  <td>
                    <Link to={`/listings?district=${encodeURIComponent(r.district)}`} className={styles.districtLink}>
                      {r.district}
                    </Link>
                  </td>
                  <td>{r.newListings}건</td>
                  <td className={r.avgPriceChange > 0 ? styles.up : r.avgPriceChange < 0 ? styles.down : ''}>
                    {r.avgPriceChange > 0 ? '+' : ''}{r.avgPriceChange.toFixed(1)}%
                  </td>
                  <td>{r.flashListings}건</td>
                  <td>{r.lowDeviationCount}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Price Rising */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.upIcon}>▲</span> 오늘 많이 오른 매물
          </h2>
          <Link to="/listings?sort=priceChange_desc" className={styles.seeAll}>더 보기 →</Link>
        </div>
        <div className={styles.listingGrid}>
          {TOP_RISING_LISTINGS.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* Price Dropping */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.downIcon}>▼</span> 가격 내린 매물
          </h2>
          <Link to="/listings?sort=priceChange_asc" className={styles.seeAll}>더 보기 →</Link>
        </div>
        <div className={styles.listingGrid}>
          {TOP_DROPPING_LISTINGS.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* Flash / Bargain */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.flashIcon}>⚡</span> 급매 추정 매물
          </h2>
          <Link to="/listings?flash=true" className={styles.seeAll}>더 보기 →</Link>
        </div>
        <div className={styles.listingGrid}>
          {FLASH_LISTINGS.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* New Listings */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.newIcon}>🆕</span> 신규 등록 매물
          </h2>
          <Link to="/listings?sort=registeredAt_desc" className={styles.seeAll}>더 보기 →</Link>
        </div>
        <div className={styles.listingGrid}>
          {NEW_LISTINGS.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </div>
  );
}
