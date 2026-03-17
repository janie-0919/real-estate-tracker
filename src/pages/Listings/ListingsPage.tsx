import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type { FilterState } from '@/types';
import { formatPrice, formatDate, formatDealType } from '@/utils/format';
import { useTransactions, useRebMarket } from '@/hooks/useTransactions';
import type { RealTransaction } from '@/services/api';
import { ALL_REGIONS, ALL_DISTRICT_CODE_MAP, SEOUL_DISTRICT_GROUPS } from '@/data/districts';
import RebMarketSection from '@/components/listings/RebMarketSection';
import TransactionCard from '@/components/listings/TransactionCard';
import ListingFilter from '@/components/listings/ListingFilter';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import styles from './ListingsPage.module.scss';

const DEFAULT_FILTER: FilterState = {
  dealType: 'all',
  districts: [],
};

const PAGE_SIZE = 20;
const MOBILE_BREAKPOINT = 768;

type TxSortField = 'dealDate' | 'price' | 'area' | 'floor';

const SORT_OPTIONS: { label: string; field: TxSortField; direction: 'asc' | 'desc' }[] = [
  { label: '최신순', field: 'dealDate', direction: 'desc' },
  { label: '가격 낮은순', field: 'price', direction: 'asc' },
  { label: '가격 높은순', field: 'price', direction: 'desc' },
  { label: '면적 큰순', field: 'area', direction: 'desc' },
];

function applyTransactionFilters(txs: RealTransaction[], filter: FilterState, query: string): RealTransaction[] {
  const q = query.trim().toLowerCase();
  return txs.filter(t => {
    if (filter.dealType !== 'all' && t.dealType !== filter.dealType) return false;
    if (filter.priceMin !== undefined && t.price < filter.priceMin) return false;
    if (filter.priceMax !== undefined && t.price > filter.priceMax) return false;
    if (filter.areaMin !== undefined && t.area < filter.areaMin) return false;
    if (filter.areaMax !== undefined && t.area > filter.areaMax) return false;
    if (filter.floorMin !== undefined && t.floor < filter.floorMin) return false;
    if (filter.floorMax !== undefined && t.floor > filter.floorMax) return false;
    if (q) {
      if (!t.complexName.toLowerCase().includes(q) && !t.neighborhood.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function applyTransactionSort(txs: RealTransaction[], field: TxSortField, direction: 'asc' | 'desc'): RealTransaction[] {
  return [...txs].sort((a, b) => {
    const aVal = a[field] ?? '';
    const bVal = b[field] ?? '';
    if (direction === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });
}

function formatTransactionPrice(t: RealTransaction): string {
  if (t.dealType === 'monthly' && t.monthlyRent) {
    return `${formatPrice(t.price)} / 월 ${t.monthlyRent.toLocaleString()}만`;
  }
  return formatPrice(t.price);
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('ellipsis');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageBtn}
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ←
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className={styles.pageEllipsis}>…</span>
        ) : (
          <button
            key={p}
            className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
            onClick={() => onChange(p as number)}
          >
            {p}
          </button>
        )
      )}
      <button
        className={styles.pageBtn}
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        →
      </button>
    </div>
  );
}

export default function ListingsPage() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const districtParam = searchParams.get('district');

  const [filter, setFilter] = useState<FilterState>(() => ({
    ...DEFAULT_FILTER,
    districts: districtParam ? [districtParam] : [],
  }));
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [sortField, setSortField] = useState<TxSortField>('dealDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'card' | 'table'>(
    () => (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT ? 'card' : 'table'),
  );
  const [currentPage, setCurrentPage] = useState(1);

  // 지역 피커: 선택된 시/도 (기본 서울)
  const [pickerSido, setPickerSido] = useState('서울');

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => {
      setViewMode(e.matches ? 'card' : 'table');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    setFilter(prev => ({ ...prev, districts: districtParam ? [districtParam] : [] }));
    setCurrentPage(1);
  }, [districtParam]);

  useEffect(() => {
    setSearchInput(urlQuery);
    setCurrentPage(1);
  }, [urlQuery]);

  const selectedDistrict = filter.districts.length === 1 ? filter.districts[0] : undefined;
  const districtCode = selectedDistrict ? ALL_DISTRICT_CODE_MAP[selectedDistrict] : undefined;

  // REB 마켓은 서울·광역시 단위 지역명만 지원 — 첫 번째 단어(시/도 접두어)를 제거
  const guName = selectedDistrict?.replace(/^[가-힣]+ /, '');

  const { data: transactions, isLoading: txLoading, isError: txError } = useTransactions({
    district: selectedDistrict,
    districtCode,
    dealType: (filter.dealType === 'monthly' ? 'all' : filter.dealType) as 'sale' | 'lease' | 'all',
    enabled: !!selectedDistrict,
  });

  const { data: rebStats, isLoading: rebLoading, isError: rebError } = useRebMarket({
    region: guName,
    months: 6,
    enabled: !!guName,
  });

  const filtered = useMemo(
    () => applyTransactionFilters(transactions ?? [], filter, searchInput),
    [transactions, filter, searchInput],
  );
  const sorted = useMemo(
    () => applyTransactionSort(filtered, sortField, sortDir),
    [filtered, sortField, sortDir],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage],
  );

  const handleFilterChange = useCallback((f: FilterState) => {
    setFilter(f);
    setCurrentPage(1);
  }, []);

  const handleSortClick = useCallback((field: TxSortField, dir: 'asc' | 'desc') => {
    setSortField(field);
    setSortDir(dir);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const activeFilterCount = [
    filter.priceMin, filter.priceMax,
    filter.areaMin, filter.areaMax,
    filter.floorMin, filter.floorMax,
  ].filter(v => v !== undefined).length;

  // 현재 피커에서 선택된 시/도 데이터
  const currentSidoRegion = ALL_REGIONS.find(r => r.sido === pickerSido);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>
            {selectedDistrict ? `${selectedDistrict} 실거래` : '전국 실거래 내역'}
          </h1>
          {selectedDistrict && (
            <p className={styles.titleSub}>최근 6개월 국토교통부 실거래 신고 자료</p>
          )}
        </div>
        <div className={styles.pageHeaderRight}>
          {selectedDistrict && (
            <Link to="/listings" className={styles.changeDistrictBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              지역 변경
            </Link>
          )}
          {selectedDistrict && transactions && (
            <p className={styles.resultCount}>
              총 <strong>{filtered.length}</strong>건
              {filtered.length !== transactions.length && ` / ${transactions.length}건`}
            </p>
          )}
        </div>
      </div>

      {selectedDistrict && (
        <div className={styles.searchBar}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="단지명, 법정동으로 검색..."
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
          />
          {searchInput && (
            <button className={styles.searchClear} onClick={() => handleSearchChange('')} aria-label="검색 초기화">
              ✕
            </button>
          )}
        </div>
      )}

      <ListingFilter
        filter={filter}
        onChange={handleFilterChange}
        onReset={() => { setFilter(DEFAULT_FILTER); setCurrentPage(1); }}
      />

      {/* ── 지역 선택 피커 (지역 미선택 시) ── */}
      {!selectedDistrict && (
        <div className={styles.districtPickerSection}>
          {/* 안내 헤더 */}
          <div className={styles.districtPickerHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {urlQuery ? (
              <span><strong>"{urlQuery}"</strong> 검색 — 지역을 선택하면 해당 지역 결과를 바로 볼 수 있습니다</span>
            ) : (
              <span>조회할 지역을 선택하세요 · 최근 6개월 실거래 데이터를 불러옵니다</span>
            )}
          </div>

          {/* 시/도 탭 */}
          <div className={styles.sidoTabList}>
            {ALL_REGIONS.map(region => (
              <button
                key={region.sido}
                className={`${styles.sidoTab} ${pickerSido === region.sido ? styles.sidoTabActive : ''}`}
                onClick={() => setPickerSido(region.sido)}
              >
                {region.sido}
              </button>
            ))}
          </div>

          {/* 선택된 시/도의 구/시/군 목록 */}
          {currentSidoRegion && (
            <>
              {/* 서울은 권역별 그룹핑 */}
              {pickerSido === '서울' ? (
                <div className={styles.districtGroupList}>
                  {SEOUL_DISTRICT_GROUPS.map(group => (
                    <div key={group.label} className={styles.districtGroup}>
                      <span className={styles.districtGroupLabel}>{group.label}</span>
                      <div className={styles.districtGrid}>
                        {group.districts.map(name => (
                          <Link
                            key={name}
                            to={`/listings?district=${encodeURIComponent(name)}${urlQuery ? `&q=${encodeURIComponent(urlQuery)}` : ''}`}
                            className={styles.districtBtn}
                          >
                            {name.replace('서울 ', '')}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* 그 외 시/도: 플랫 그리드 */
                <div className={styles.districtGrid}>
                  {currentSidoRegion.districts.map(d => (
                    <Link
                      key={d.name}
                      to={`/listings?district=${encodeURIComponent(d.name)}${urlQuery ? `&q=${encodeURIComponent(urlQuery)}` : ''}`}
                      className={styles.districtBtn}
                    >
                      {d.name.replace(`${currentSidoRegion.sido} `, '')}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {selectedDistrict && (
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.sortGroup}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={`${opt.field}_${opt.direction}`}
                  className={`${styles.sortBtn} ${sortField === opt.field && sortDir === opt.direction ? styles.active : ''}`}
                  onClick={() => handleSortClick(opt.field, opt.direction)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}개 필터 적용 중</span>
            )}
          </div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'card' ? styles.active : ''}`}
              onClick={() => setViewMode('card')}
              title="카드 뷰"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="8" height="8" rx="1" />
                <rect x="13" y="3" width="8" height="8" rx="1" />
                <rect x="3" y="13" width="8" height="8" rx="1" />
                <rect x="13" y="13" width="8" height="8" rx="1" />
              </svg>
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'table' ? styles.active : ''}`}
              onClick={() => setViewMode('table')}
              title="테이블 뷰"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {selectedDistrict && (
        <>
          {txLoading ? (
            <div className={styles.cardGrid}>
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : txError ? (
            <EmptyState
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              }
              title="데이터를 불러올 수 없습니다"
              description="서버 연결 또는 API 키를 확인하세요."
            />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              }
              title="조건에 맞는 거래 내역이 없습니다"
              description="검색어나 필터 조건을 변경해보세요."
            />
          ) : viewMode === 'card' ? (
            <div className={styles.cardGrid}>
              {pageItems.map((t, idx) => (
                <TransactionCard key={`${t.id}_${idx}`} transaction={t} />
              ))}
            </div>
          ) : (
            <div className={styles.txTable}>
              <table>
                <thead>
                  <tr>
                    <th>단지명</th>
                    <th>법정동</th>
                    <th>거래유형</th>
                    <th>가격</th>
                    <th>면적(㎡)</th>
                    <th>층</th>
                    <th>건축년도</th>
                    <th>거래일</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((t, idx) => (
                    <tr key={`${t.id}_${idx}`}>
                      <td>
                        <Link
                          className={styles.complexLink}
                          to={`/complex-detail?name=${encodeURIComponent(t.complexName)}&district=${encodeURIComponent(t.district)}`}
                        >
                          {t.complexName}
                        </Link>
                      </td>
                      <td>{t.neighborhood}</td>
                      <td>
                        <Badge
                          variant={t.dealType === 'sale' ? 'primary' : t.dealType === 'lease' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {formatDealType(t.dealType)}
                        </Badge>
                      </td>
                      <td className={styles.txPrice}>{formatTransactionPrice(t)}</td>
                      <td>{t.area.toFixed(1)}</td>
                      <td>{t.floor}층</td>
                      <td>{t.buildYear}년</td>
                      <td>{formatDate(t.dealDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sorted.length > 0 && (
            <div className={styles.paginationRow}>
              <span className={styles.pageInfo}>
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} / {sorted.length}건
              </span>
              <Pagination currentPage={currentPage} totalPages={totalPages} onChange={handlePageChange} />
              <span className={styles.pageInfo}>{currentPage} / {totalPages} 페이지</span>
            </div>
          )}

          <RebMarketSection
            district={selectedDistrict}
            stats={rebStats ?? []}
            isLoading={rebLoading}
            isError={rebError}
          />
        </>
      )}
    </div>
  );
}
