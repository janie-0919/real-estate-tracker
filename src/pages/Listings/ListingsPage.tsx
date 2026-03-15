import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { mockListings } from '@/data/mockListings';
import type { FilterState, SortState, Listing, ViewMode } from '@/types';
import { formatPrice, formatDate, formatDealType, formatDeviation, formatPriceChange } from '@/utils/format';
import ListingCard from '@/components/listings/ListingCard';
import ListingFilter from '@/components/listings/ListingFilter';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import styles from './ListingsPage.module.scss';
import { Link } from 'react-router-dom';

const DEFAULT_FILTER: FilterState = {
  dealType: 'all',
  districts: [],
  isSubwayNear: false,
  hasPriceChange: false,
  isSuspectedFlash: false,
  renovated: null,
};

const SORT_OPTIONS: { label: string; field: SortState['field']; direction: SortState['direction'] }[] = [
  { label: '최신순', field: 'updatedAt', direction: 'desc' },
  { label: '가격 낮은순', field: 'price', direction: 'asc' },
  { label: '가격 높은순', field: 'price', direction: 'desc' },
  { label: '면적 큰순', field: 'area', direction: 'desc' },
  { label: '가격 인상순', field: 'priceChange', direction: 'desc' },
  { label: '가격 인하순', field: 'priceChange', direction: 'asc' },
  { label: '실거래 괴리율', field: 'deviationFromActual', direction: 'asc' },
];

const columnHelper = createColumnHelper<Listing>();

function applyFilters(listings: Listing[], filter: FilterState, query: string): Listing[] {
  return listings.filter(l => {
    if (filter.dealType !== 'all' && l.dealType !== filter.dealType) return false;
    if (filter.districts.length > 0 && !filter.districts.includes(l.district)) return false;
    if (filter.priceMin !== undefined && l.price < filter.priceMin) return false;
    if (filter.priceMax !== undefined && l.price > filter.priceMax) return false;
    if (filter.areaMin !== undefined && l.area < filter.areaMin) return false;
    if (filter.areaMax !== undefined && l.area > filter.areaMax) return false;
    if (filter.floorMin !== undefined && l.floor < filter.floorMin) return false;
    if (filter.floorMax !== undefined && l.floor > filter.floorMax) return false;
    if (filter.isSubwayNear && !l.isSubwayNear) return false;
    if (filter.hasPriceChange && l.priceChangeDirection === 'neutral') return false;
    if (filter.isSuspectedFlash && (l.deviationFromActual ?? 0) >= 0) return false;
    if (filter.deviationMax !== undefined && (l.deviationFromActual ?? 0) > filter.deviationMax) return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !l.complexName.toLowerCase().includes(q) &&
        !l.district.toLowerCase().includes(q) &&
        !l.neighborhood.toLowerCase().includes(q) &&
        !l.address.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });
}

function applySort(listings: Listing[], sort: SortState): Listing[] {
  return [...listings].sort((a, b) => {
    const aVal = (a[sort.field as keyof Listing] ?? 0) as number;
    const bVal = (b[sort.field as keyof Listing] ?? 0) as number;
    return sort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });
}

export default function ListingsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const districtParam = searchParams.get('district');

  const [filter, setFilter] = useState<FilterState>(() => ({
    ...DEFAULT_FILTER,
    districts: districtParam ? [districtParam] : [],
  }));
  const [sort, setSort] = useState<SortState>({ field: 'updatedAt', direction: 'desc' });
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => applyFilters(mockListings, filter, query), [filter, query]);
  const sorted = useMemo(() => applySort(filtered, sort), [filtered, sort]);
  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < sorted.length) {
        setVisibleCount(prev => Math.min(prev + 8, sorted.length));
      }
    }, { threshold: 0.1 });

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [visibleCount, sorted.length]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const columns = useMemo(() => [
    columnHelper.accessor('complexName', {
      header: '단지명',
      cell: info => (
        <Link to={`/listings/${info.row.original.id}`} className={styles.tableLink}>
          <div className={styles.complexCell}>
            <span className={styles.complexName}>{info.getValue()}</span>
            <span className={styles.addressText}>{info.row.original.neighborhood}</span>
          </div>
        </Link>
      ),
    }),
    columnHelper.accessor('dealType', {
      header: '거래',
      cell: info => <Badge variant={info.getValue() === 'sale' ? 'primary' : info.getValue() === 'lease' ? 'success' : 'warning'}>{formatDealType(info.getValue())}</Badge>,
    }),
    columnHelper.accessor('price', {
      header: '가격',
      cell: info => (
        <div className={styles.priceCell}>
          <span className={styles.priceValue}>{formatPrice(info.getValue())}</span>
          {info.row.original.priceChange !== 0 && (
            <span className={info.row.original.priceChangeDirection === 'up' ? styles.priceUp : styles.priceDown}>
              {info.row.original.priceChangeDirection === 'up' ? '▲' : '▼'}
              {formatPriceChange(info.row.original.priceChange ?? 0)}
            </span>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('area', {
      header: '면적',
      cell: info => `${info.getValue()}㎡`,
    }),
    columnHelper.accessor('floor', {
      header: '층',
      cell: info => `${info.getValue()}/${info.row.original.totalFloors}층`,
    }),
    columnHelper.accessor('direction', { header: '방향' }),
    columnHelper.accessor('deviationFromActual', {
      header: '실거래 대비',
      cell: info => {
        const val = info.getValue() ?? 0;
        const color = val < 0 ? '#2563eb' : val < 3 ? '#16a34a' : val < 6 ? '#d97706' : '#dc2626';
        return (
          <span style={{ color, fontWeight: 600 }}>{formatDeviation(val)}</span>
        );
      },
    }),
    columnHelper.accessor('deviationLabel', {
      header: '판단',
      cell: info => <span className={styles.deviationLabel}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('updatedAt', {
      header: '업데이트',
      cell: info => formatDate(info.getValue()),
    }),
  ], []);

  const table = useReactTable({
    data: visible,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>매물 목록</h1>
          {query && (
            <p className={styles.searchQuery}>
              "<strong>{query}</strong>" 검색 결과
            </p>
          )}
        </div>
        <p className={styles.resultCount}>
          총 <strong>{filtered.length}</strong>개 매물
        </p>
      </div>

      {/* Filter */}
      <ListingFilter
        filter={filter}
        onChange={setFilter}
        onReset={() => setFilter(DEFAULT_FILTER)}
      />

      {/* Sort & View Toggle toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.sortGroup}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={`${opt.field}_${opt.direction}`}
              className={`${styles.sortBtn} ${sort.field === opt.field && sort.direction === opt.direction ? styles.active : ''}`}
              onClick={() => setSort({ field: opt.field, direction: opt.direction })}
            >
              {opt.label}
            </button>
          ))}
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

      {/* Content */}
      {isLoading ? (
        <div className={styles.cardGrid}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          }
          title="조건에 맞는 매물이 없습니다"
          description="필터 조건을 변경하거나 검색어를 다시 확인해주세요."
        />
      ) : viewMode === 'card' ? (
        <div className={styles.cardGrid}>
          {visible.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorited={favorites.has(listing.id)}
              onFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Infinite scroll loader */}
      {visibleCount < sorted.length && (
        <div ref={loaderRef} className={styles.loader}>
          <span className={styles.loaderText}>더 불러오는 중...</span>
        </div>
      )}

      {visibleCount >= sorted.length && sorted.length > 0 && (
        <p className={styles.endMessage}>모든 매물을 불러왔습니다 ({sorted.length}개)</p>
      )}
    </div>
  );
}
