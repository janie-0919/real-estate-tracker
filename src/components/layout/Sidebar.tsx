import { useState } from 'react';
import { NavLink, Link, useSearchParams, useLocation } from 'react-router-dom';
import { ALL_REGIONS } from '@/data/districts';
import { useFavoriteDistricts } from '@/hooks/useFavoriteDistricts';
import styles from './Sidebar.module.scss';

const NAV_ITEMS = [
  {
    to: '/',
    label: '대시보드',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/listings',
    label: '매물 목록',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/favorites',
    label: '즐겨찾기',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
  {
    to: '/alerts',
    label: '알림 설정',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { favorites, toggle, isFavorite } = useFavoriteDistricts();
  const [isEditing, setIsEditing] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeDistrict = location.pathname === '/listings' ? searchParams.get('district') : null;

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <div className={styles.section}>
          <p className={styles.sectionLabel}>메뉴</p>
          <ul className={styles.navList}>
            {NAV_ITEMS.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.active : ''}`
                  }
                >
                  <span className={styles.icon}>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabelRow}>
            <p className={styles.sectionLabel}>관심 지역</p>
            <button
              className={`${styles.editBtn} ${isEditing ? styles.editBtnActive : ''}`}
              onClick={() => setIsEditing(v => !v)}
              title={isEditing ? '완료' : '편집'}
            >
              {isEditing ? '완료' : '편집'}
            </button>
          </div>

          {isEditing ? (
              <div className={styles.regionPicker}>
                {ALL_REGIONS.map(region => (
                    <div key={region.sido}>
                      <p className={styles.regionLabel}>{region.sido}</p>
                      <ul className={styles.navList}>
                        {region.districts.map(d => (
                            <li key={d.name}>
                              <button
                                  className={`${styles.districtToggleItem} ${isFavorite(d.name) ? styles.districtToggleActive : ''}`}
                                  onClick={() => toggle(d.name)}
                              >
                <span className={styles.icon}>
                  {isFavorite(d.name) ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                  ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                  )}
                </span>
                                <span className={styles.districtName}>
                  {d.name.replace(`${region.sido} `, '')}
                </span>
                              </button>
                            </li>
                        ))}
                      </ul>
                    </div>
                ))}
              </div>
          ) : favorites.length === 0 ? (
            <p className={styles.emptyHint}>
              편집을 눌러 관심 지역을 추가하세요
            </p>
          ) : (
            <ul className={styles.navList}>
              {favorites.map(district => (
                <li key={district}>
                  <Link
                    to={`/listings?district=${encodeURIComponent(district)}`}
                    className={`${styles.navItem} ${activeDistrict === district ? styles.active : ''}`}
                  >
                    <span className={styles.icon}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <span className={styles.districtName}>
                      {district.replace('서울 ', '')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      <div className={styles.footer}>
        <p className={styles.updateInfo}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          마지막 업데이트: 방금 전
        </p>
      </div>
    </aside>
  );
}
