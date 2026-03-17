import { Link, useLocation } from 'react-router-dom';
import { useFavoriteComplexes, type FavoriteComplex } from '@/hooks/useFavoriteComplexes';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/contexts/AuthContext';
import { type RealTransaction } from '@/services/api';
import { formatPrice, formatDateShort } from '@/utils/format';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import styles from './FavoritesPage.module.scss';

function FavoriteCard({ fav, onRemove }: { fav: FavoriteComplex; onRemove: () => void }) {
  const { data: transactions, isLoading } = useTransactions({
    district: fav.district,
    complex: fav.name,
    dealType: 'all',
  });

  const recentSale = transactions?.find(t => t.dealType === 'sale');
  const recentLease = transactions?.find(t => t.dealType === 'lease' || t.dealType === 'monthly');

  const detailUrl = `/complex-detail?name=${encodeURIComponent(fav.name)}&district=${encodeURIComponent(fav.district)}`;

  return (
    <div className={styles.complexCard}>
      <Link to={detailUrl} className={styles.complexLink}>
        <div className={styles.complexName}>{fav.name}</div>
        <div className={styles.complexDistrict}>{fav.district}</div>
      </Link>

      <div className={styles.statsArea}>
        {isLoading ? (
          <>
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} style={{ width: '70%' }} />
          </>
        ) : (
          <>
            {recentSale && <StatRow tx={recentSale} />}
            {recentLease && <StatRow tx={recentLease} />}
            {!recentSale && !recentLease && (
              <p className={styles.noData}>최근 거래 내역 없음</p>
            )}
          </>
        )}
      </div>

      <div className={styles.complexFooter}>
        <span className={styles.addedAt}>
          {new Date(fav.addedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 추가
        </span>
        <button className={styles.removeBtn} onClick={onRemove} title="삭제">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function StatRow({ tx }: { tx: RealTransaction }) {
  const labelMap: Record<string, string> = { sale: '매매', lease: '전세', monthly: '월세' };
  const label = labelMap[tx.dealType] ?? tx.dealType;

  let priceStr = formatPrice(tx.price, tx.dealType);
  if (tx.dealType === 'monthly' && tx.monthlyRent) {
    priceStr = `${formatPrice(tx.price)} / ${tx.monthlyRent}만`;
  }

  return (
    <div className={styles.statRow}>
      <span className={`${styles.statLabel} ${styles[`label_${tx.dealType}`]}`}>{label}</span>
      <span className={styles.statPrice}>{priceStr}</span>
      <span className={styles.statDate}>{formatDateShort(tx.dealDate)}</span>
    </div>
  );
}

export default function FavoritesPage() {
  const { favorites, remove, clear } = useFavoriteComplexes();
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>즐겨찾기</h1>
          <p className={styles.sub}>관심 단지를 모아보세요</p>
        </div>
        <span className={styles.count}>{favorites.length}개 단지</span>
      </div>

      {!user && (
        <div className={styles.loginBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>현재 즐겨찾기는 이 기기에만 저장됩니다.</span>
          <Link to={`/login?from=${encodeURIComponent(location.pathname)}`} className={styles.loginBannerLink}>
            로그인하면 기기 간 동기화
          </Link>
        </div>
      )}

      {favorites.length === 0 ? (
        <EmptyState
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          }
          title="즐겨찾기한 단지가 없습니다"
          description="단지 상세 페이지에서 ♥ 버튼을 눌러 관심 단지를 추가하세요."
          action={
            <Link to="/listings">
              <Button variant="primary">매물 목록 보기</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className={styles.grid}>
            {favorites.map(fav => (
              <FavoriteCard
                key={`${fav.district}_${fav.name}`}
                fav={fav}
                onRemove={() => remove(fav.name, fav.district)}
              />
            ))}
          </div>

          <div className={styles.footer}>
            <Button variant="ghost" size="sm" onClick={clear}>전체 삭제</Button>
          </div>
        </>
      )}
    </div>
  );
}
