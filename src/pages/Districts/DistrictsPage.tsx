import { Link } from 'react-router-dom';
import { ALL_REGIONS } from '@/data/districts';
import { useFavoriteDistricts } from '@/hooks/useFavoriteDistricts';
import styles from './DistrictsPage.module.scss';

export default function DistrictsPage() {
    const { favorites, toggle, isFavorite } = useFavoriteDistricts();

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>관심 지역 관리</h1>
                    <p className={styles.sub}>관심 지역을 선택하면 사이드바와 드로어에 표시됩니다.</p>
                </div>
                <Link to="/" className={styles.backBtn}>← 돌아가기</Link>
            </div>

            <div className={styles.selectedSection}>
                <h2 className={styles.sectionTitle}>선택된 지역 ({favorites.length})</h2>
                {favorites.length === 0 ? (
                    <p className={styles.empty}>선택된 관심 지역이 없습니다.</p>
                ) : (
                    <div className={styles.chipList}>
                        {favorites.map(district => (
                            <button
                                key={district}
                                className={`${styles.chip} ${styles.chipActive}`}
                                onClick={() => toggle(district)}
                            >
                                {district}
                                <span className={styles.chipRemove}>✕</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.allSection}>
                <h2 className={styles.sectionTitle}>전체 지역</h2>
                {ALL_REGIONS.map(region => (
                    <div key={region.sido} className={styles.regionBlock}>
                        <p className={styles.regionLabel}>{region.label}</p>
                        <div className={styles.chipList}>
                            {region.districts.map(d => (
                                <button
                                    key={d.name}
                                    className={`${styles.chip} ${isFavorite(d.name) ? styles.chipActive : ''}`}
                                    onClick={() => toggle(d.name)}
                                >
                                    {d.name.replace(`${region.sido} `, '')}
                                    {isFavorite(d.name) && <span className={styles.chipRemove}>✕</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}