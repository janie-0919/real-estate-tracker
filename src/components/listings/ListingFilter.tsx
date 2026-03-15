import { useState } from 'react';
import type { FilterState } from '@/types';
import Button from '@/components/ui/Button';
import styles from './ListingFilter.module.scss';

const DISTRICTS = [
  '서울 서초구', '서울 강남구', '서울 마포구', '서울 성동구',
  '서울 용산구', '서울 송파구', '서울 영등포구', '서울 노원구',
];

interface ListingFilterProps {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
  onReset: () => void;
}

export default function ListingFilter({ filter, onChange, onReset }: ListingFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({ ...filter, [key]: value });
  };

  const toggleDistrict = (district: string) => {
    const next = filter.districts.includes(district)
      ? filter.districts.filter(d => d !== district)
      : [...filter.districts, district];
    update('districts', next);
  };

  return (
    <div className={styles.container}>
      {/* Quick filters row */}
      <div className={styles.quickFilters}>
        {/* Deal type */}
        <div className={styles.filterGroup}>
          <label className={styles.groupLabel}>거래 유형</label>
          <div className={styles.toggleGroup}>
            {(['all', 'sale', 'lease', 'monthly'] as const).map(type => (
              <button
                key={type}
                className={`${styles.toggle} ${filter.dealType === type ? styles.active : ''}`}
                onClick={() => update('dealType', type)}
              >
                {type === 'all' ? '전체' : type === 'sale' ? '매매' : type === 'lease' ? '전세' : '월세'}
              </button>
            ))}
          </div>
        </div>

        {/* Special filters */}
        <div className={styles.filterGroup}>
          <label className={styles.groupLabel}>특수 필터</label>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={filter.isSubwayNear}
                onChange={e => update('isSubwayNear', e.target.checked)}
              />
              역세권
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={filter.hasPriceChange}
                onChange={e => update('hasPriceChange', e.target.checked)}
              />
              가격 변동
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={filter.isSuspectedFlash}
                onChange={e => update('isSuspectedFlash', e.target.checked)}
              />
              급매 추정
            </label>
          </div>
        </div>

        <div className={styles.filterActions}>
          <button className={styles.expandBtn} onClick={() => setIsExpanded(!isExpanded)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="14" y2="12" />
              <line x1="4" y1="18" x2="10" y2="18" />
            </svg>
            상세 필터 {isExpanded ? '접기' : '펼치기'}
          </button>
          <Button variant="ghost" size="sm" onClick={onReset}>초기화</Button>
        </div>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className={styles.expandedFilters}>
          {/* Districts */}
          <div className={styles.filterGroup}>
            <label className={styles.groupLabel}>지역</label>
            <div className={styles.districtGrid}>
              {DISTRICTS.map(d => (
                <button
                  key={d}
                  className={`${styles.districtBtn} ${filter.districts.includes(d) ? styles.active : ''}`}
                  onClick={() => toggleDistrict(d)}
                >
                  {d.replace('서울 ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className={styles.rangeGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.groupLabel}>가격 (만원)</label>
              <div className={styles.rangeRow}>
                <input
                  type="number"
                  placeholder="최소"
                  value={filter.priceMin ?? ''}
                  onChange={e => update('priceMin', e.target.value ? Number(e.target.value) : undefined)}
                  className={styles.rangeInput}
                />
                <span className={styles.rangeSep}>~</span>
                <input
                  type="number"
                  placeholder="최대"
                  value={filter.priceMax ?? ''}
                  onChange={e => update('priceMax', e.target.value ? Number(e.target.value) : undefined)}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.groupLabel}>면적 (㎡)</label>
              <div className={styles.rangeRow}>
                <input
                  type="number"
                  placeholder="최소"
                  value={filter.areaMin ?? ''}
                  onChange={e => update('areaMin', e.target.value ? Number(e.target.value) : undefined)}
                  className={styles.rangeInput}
                />
                <span className={styles.rangeSep}>~</span>
                <input
                  type="number"
                  placeholder="최대"
                  value={filter.areaMax ?? ''}
                  onChange={e => update('areaMax', e.target.value ? Number(e.target.value) : undefined)}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.groupLabel}>층수</label>
              <div className={styles.rangeRow}>
                <input
                  type="number"
                  placeholder="최소"
                  value={filter.floorMin ?? ''}
                  onChange={e => update('floorMin', e.target.value ? Number(e.target.value) : undefined)}
                  className={styles.rangeInput}
                />
                <span className={styles.rangeSep}>~</span>
                <input
                  type="number"
                  placeholder="최대"
                  value={filter.floorMax ?? ''}
                  onChange={e => update('floorMax', e.target.value ? Number(e.target.value) : undefined)}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.groupLabel}>실거래 대비 (%)</label>
              <div className={styles.rangeRow}>
                <input
                  type="number"
                  placeholder="이하"
                  value={filter.deviationMax ?? ''}
                  onChange={e => update('deviationMax', e.target.value ? Number(e.target.value) : undefined)}
                  className={styles.rangeInput}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
