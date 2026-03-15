import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Header.module.scss';

export default function Header() {
  const [searchValue, setSearchValue] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/listings?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="#2563EB" />
            <path d="M6 22L16 10L26 22H6Z" fill="white" opacity="0.9" />
            <rect x="12" y="16" width="8" height="6" fill="#1E40AF" />
          </svg>
          <span className={styles.logoText}>부동산 트래커</span>
        </Link>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder="단지명, 지역, 주소 검색"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </form>

        <nav className={styles.nav}>
          <Link to="/listings" className={styles.navLink}>매물 목록</Link>
          <Link to="/favorites" className={styles.navLink}>즐겨찾기</Link>
          <Link to="/alerts" className={styles.navLink}>알림 설정</Link>
          <Link to="/login" className={styles.loginBtn}>로그인</Link>
        </nav>
      </div>
    </header>
  );
}
