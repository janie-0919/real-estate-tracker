import { Link } from 'react-router-dom';
import type { RealTransaction } from '@/services/api';
import { formatPrice, formatDate, formatDealType } from '@/utils/format';
import Badge from '@/components/ui/Badge';
import styles from './TransactionCard.module.scss';

interface Props {
  transaction: RealTransaction;
}

export default function TransactionCard({ transaction: t }: Props) {
  const to = `/complex-detail?name=${encodeURIComponent(t.complexName)}&district=${encodeURIComponent(t.district)}`;

  return (
    <Link to={to} className={styles.link}>
      <article className={styles.card}>
        <div className={styles.topRow}>
          <Badge
            variant={t.dealType === 'sale' ? 'primary' : t.dealType === 'lease' ? 'success' : 'warning'}
            size="sm"
          >
            {formatDealType(t.dealType)}
          </Badge>
          <span className={styles.date}>{formatDate(t.dealDate)}</span>
        </div>

        <h3 className={styles.complexName}>{t.complexName}</h3>
        <p className={styles.meta}>
          {t.neighborhood} · {t.area.toFixed(1)}㎡ · {t.floor}층 · {t.buildYear}년
        </p>

        <div className={styles.price}>
          {t.dealType === 'monthly' && t.monthlyRent
            ? `${formatPrice(t.price)} / 월 ${t.monthlyRent.toLocaleString()}만`
            : formatPrice(t.price)}
        </div>

        <div className={styles.footer}>
          <span className={styles.source}>국토부 실거래</span>
          <span className={styles.district}>{t.district.replace('서울 ', '')}</span>
        </div>
      </article>
    </Link>
  );
}
