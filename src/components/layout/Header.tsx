import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { parseSearchQuery, buildListingsUrl } from '@/utils/search';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoriteDistricts } from '@/hooks/useFavoriteDistricts';
import styles from './Header.module.scss';

export default function Header() {
  const [searchValue, setSearchValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { favorites } = useFavoriteDistricts();

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    const { district, query } = parseSearchQuery(searchValue.trim());
    navigate(buildListingsUrl(district, query));
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    alert('로그아웃 되었습니다.');
    navigate('/');
  };

  const displayName = user?.user_metadata?.name
    ?? user?.email?.split('@')[0]
    ?? '사용자';

  return (
    <>
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
            {authLoading ? (
              <div className={styles.authSkeleton} />
            ) : user ? (
              <div className={styles.userArea}>
                <span className={styles.userName}><strong>{displayName}</strong>님, 안녕하세요!</span>
                <button className={styles.logoutBtn} onClick={handleSignOut}>로그아웃</button>
              </div>
            ) : (
              <Link to="/login" className={styles.loginBtn}>로그인</Link>
            )}
          </nav>

          {/* 모바일 햄버거 버튼 */}
          <button
            className={styles.menuBtn}
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* 모바일 드로어 메뉴 */}
      <div className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ''}`}>
        <form className={styles.drawerSearch} onSubmit={handleSearch}>
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

        <nav className={styles.drawerNav}>
          <Link to="/" className={styles.drawerNavLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            대시보드
          </Link>
          <Link to="/listings" className={styles.drawerNavLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            매물 목록
          </Link>
          <Link to="/favorites" className={styles.drawerNavLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            즐겨찾기
          </Link>
          <Link to="/alerts" className={styles.drawerNavLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            알림 설정
          </Link>
        </nav>
        {/* 드로어 관심 지역 */}
        <div className={styles.drawerDistricts}>
          <div className={styles.drawerDistrictHeader}>
            <p className={styles.drawerDistrictLabel}>관심 지역</p>
            <Link
                to="/districts"
                className={styles.drawerDistrictEdit}
                onClick={() => setMenuOpen(false)}
            >
              편집
            </Link>
          </div>
          {favorites.length > 0 ? (
              <div className={styles.drawerDistrictList}>
                {favorites.map(district => (
                    <Link
                        key={district}
                        to={`/listings?district=${encodeURIComponent(district)}`}
                        className={styles.drawerDistrictItem}
                        onClick={() => setMenuOpen(false)}
                    >
                      {district.replace(/^[가-힣]+ /, '')}
                    </Link>
                ))}
              </div>
          ) : (
              <p className={styles.drawerDistrictEmpty}>편집을 눌러 관심 지역을 추가하세요</p>
          )}
        </div>
        <div className={styles.drawerFooter}>
          {authLoading ? (
            <div className={styles.authSkeleton} style={{ width: '100%', height: '40px' }} />
          ) : user ? (
            <>
              <span className={styles.drawerUserName}>{displayName}님</span>
              <button className={styles.drawerLogoutBtn} onClick={handleSignOut}>로그아웃</button>
            </>
          ) : (
            <Link to="/login" className={styles.drawerLoginBtn}>로그인</Link>
          )}
        </div>
      </div>

      {/* 드로어 오버레이 */}
      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}
    </>
  );
}
