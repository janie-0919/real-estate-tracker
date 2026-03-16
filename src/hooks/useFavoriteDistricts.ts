import { useState, useCallback } from 'react';

const STORAGE_KEY = 'favoriteDistricts';
const DEFAULT_FAVORITES = ['서울 강남구', '서울 서초구', '서울 마포구'];

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // ignore
  }
  return DEFAULT_FAVORITES;
}

function saveToStorage(districts: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(districts));
}

export function useFavoriteDistricts() {
  const [favorites, setFavorites] = useState<string[]>(loadFromStorage);

  const toggle = useCallback((district: string) => {
    setFavorites(prev => {
      const next = prev.includes(district)
        ? prev.filter(d => d !== district)
        : [...prev, district];
      saveToStorage(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (district: string) => favorites.includes(district),
    [favorites],
  );

  return { favorites, toggle, isFavorite };
}
