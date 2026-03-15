import styles from './Skeleton.module.scss';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width, height = 16, borderRadius, className = '' }: SkeletonProps) {
  return (
    <span
      className={`${styles.skeleton} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
        display: 'block',
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <Skeleton height={180} borderRadius="8px 8px 0 0" />
      <div className={styles.body}>
        <Skeleton height={20} width="60%" />
        <Skeleton height={14} width="40%" />
        <div className={styles.row}>
          <Skeleton height={24} width="45%" />
          <Skeleton height={20} width="25%" />
        </div>
        <Skeleton height={12} width="80%" />
        <Skeleton height={12} width="65%" />
      </div>
    </div>
  );
}
