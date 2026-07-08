'use client';
import { Link } from '@/compat/router';
import type { Listing } from '@/types';
import {
  formatPrice,
  formatPriceChange,
  formatDeviation,
  formatDate,
  formatDealType,
  getDeviationColor,
} from '@/utils/format';
import Badge from '@/components/ui/Badge';
import styles from './ListingCard.module.scss';

interface ListingCardProps {
  listing: Listing;
  isFavorited?: boolean;
  onFavorite?: (id: string) => void;
}

const PriceChangeIcon = ({ direction }: { direction: string }) => {
  if (direction === 'up') return <span className={styles.priceUp}>▲</span>;
  if (direction === 'down') return <span className={styles.priceDown}>▼</span>;
  return <span className={styles.priceNeutral}>−</span>;
};

export default function ListingCard({ listing, isFavorited = false, onFavorite }: ListingCardProps) {
  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavorite?.(listing.id);
  };

  const deviationColor = getDeviationColor(listing.deviationFromActual ?? 0);

  return (
    <Link to={`/listings/${listing.id}`} className={styles.link}>
      <article className={styles.card}>
        {/* Thumbnail */}
        <div className={styles.thumbnail}>
          <img
            src={listing.thumbnailUrl}
            alt={listing.complexName}
            loading="lazy"
            onError={e => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"%3E%3Crect fill="%23e5e7eb" width="400" height="240"/%3E%3Ctext x="200" y="120" text-anchor="middle" dominant-baseline="middle" fill="%239ca3af" font-size="48"%3E🏠%3C/text%3E%3C/svg%3E';
            }}
          />

          {/* Badges overlay */}
          <div className={styles.thumbnailBadges}>
            <span className={`${styles.dealTypeBadge} ${styles[`deal-${listing.dealType}`]}`}>
              {formatDealType(listing.dealType)}
            </span>
            {listing.isSuspectedDuplicate && (
              <span className={styles.warningBadge}>중복의심</span>
            )}
            {listing.isReRegistered && (
              <span className={styles.warningBadge}>재등록</span>
            )}
          </div>

          <button
            className={`${styles.favoriteBtn} ${isFavorited ? styles.favorited : ''}`}
            onClick={handleFavorite}
            aria-label={isFavorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.complexName}>{listing.complexName}</h3>
            <p className={styles.address}>{listing.neighborhood} · {listing.area}㎡ · {listing.floor}층</p>
          </div>

          {/* Price */}
          <div className={styles.priceRow}>
            <div className={styles.price}>
              {listing.dealType === 'monthly' ? (
                <span>
                  {formatPrice(listing.depositPrice ?? 0)} / {listing.monthlyRent}만
                </span>
              ) : (
                <span>{formatPrice(listing.price)}</span>
              )}
            </div>
            {listing.priceChange !== 0 && listing.priceChange !== undefined && (
              <div className={styles.priceChange}>
                <PriceChangeIcon direction={listing.priceChangeDirection ?? 'neutral'} />
                <span className={listing.priceChangeDirection === 'up' ? styles.priceUp : styles.priceDown}>
                  {formatPriceChange(listing.priceChange)}
                </span>
              </div>
            )}
          </div>

          {/* Deviation from actual */}
          <div className={styles.deviationRow}>
            <span
              className={styles.deviationBadge}
              style={{ color: deviationColor, borderColor: deviationColor + '40', backgroundColor: deviationColor + '10' }}
            >
              실거래 대비 {formatDeviation(listing.deviationFromActual ?? 0)}
            </span>
            {listing.deviationLabel && (
              <span className={styles.deviationLabel}>{listing.deviationLabel}</span>
            )}
          </div>

          {/* Tags */}
          <div className={styles.tags}>
            {listing.isSubwayNear && (
              <Badge variant="info" size="sm">
                {listing.subwayStation} {listing.subwayDistance}m
              </Badge>
            )}
            {listing.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="default" size="sm">{tag}</Badge>
            ))}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <span className={styles.date}>
              {formatDate(listing.updatedAt)} 업데이트
            </span>
            <span className={styles.agent}>{listing.agent.agency}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
