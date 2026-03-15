import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockListings } from '@/data/mockListings';
import ListingCard from '@/components/listings/ListingCard';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import styles from './FavoritesPage.module.scss';

const DEMO_FAVORITES = ['L001', 'L003', 'L009', 'L012'];

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set(DEMO_FAVORITES));
  const [note, setNote] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const favListings = mockListings.filter(l => favorites.has(l.id));

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>즐겨찾기</h1>
          <p className={styles.sub}>관심 매물을 모아보세요</p>
        </div>
        <span className={styles.count}>{favorites.size}개 매물</span>
      </div>

      {favListings.length === 0 ? (
        <EmptyState
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          }
          title="즐겨찾기한 매물이 없습니다"
          description="매물 목록에서 ♥ 버튼을 눌러 관심 매물을 추가하세요."
          action={
            <Link to="/listings">
              <Button variant="primary">매물 목록 보기</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className={styles.grid}>
            {favListings.map(listing => (
              <div key={listing.id} className={styles.listingWrapper}>
                <ListingCard
                  listing={listing}
                  isFavorited={favorites.has(listing.id)}
                  onFavorite={toggleFavorite}
                />
                {/* Note section */}
                <div className={styles.noteSection}>
                  {editingNote === listing.id ? (
                    <div className={styles.noteEdit}>
                      <textarea
                        className={styles.noteInput}
                        placeholder="메모를 입력하세요..."
                        value={note[listing.id] ?? ''}
                        onChange={e => setNote(prev => ({ ...prev, [listing.id]: e.target.value }))}
                        rows={2}
                      />
                      <Button size="sm" variant="primary" onClick={() => setEditingNote(null)}>저장</Button>
                    </div>
                  ) : (
                    <button
                      className={styles.noteBtn}
                      onClick={() => setEditingNote(listing.id)}
                    >
                      {note[listing.id] ? (
                        <span className={styles.noteText}>📝 {note[listing.id]}</span>
                      ) : (
                        <span className={styles.notePlaceholder}>+ 메모 추가</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <Button variant="ghost" size="sm" onClick={() => setFavorites(new Set())}>
              전체 삭제
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
