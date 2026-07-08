'use client';
import { Link } from '@/compat/router';
import Button from '@/components/ui/Button';
import styles from './NotFoundPage.module.scss';

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>페이지를 찾을 수 없습니다</h2>
        <p className={styles.description}>
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <div className={styles.actions}>
          <Link to="/">
            <Button variant="primary" size="lg">홈으로 가기</Button>
          </Link>
          <Link to="/listings">
            <Button variant="secondary" size="lg">매물 목록 보기</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
