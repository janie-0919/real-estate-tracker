import { useState, useCallback } from 'react';

export interface FavoriteComplex {
  name: string;
  district: string;
  addedAt: string;
}

const STORAGE_KEY = 'favorite_complexes';

function load(): FavoriteComplex[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(items: FavoriteComplex[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useFavoriteComplexes() {
  const [favorites, setFavorites] = useState<FavoriteComplex[]>(load);

  const toggle = useCallback((name: string, district: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.name === name && f.district === district);
      const next = exists
        ? prev.filter(f => !(f.name === name && f.district === district))
        : [...prev, { name, district, addedAt: new Date().toISOString() }];
      save(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((name: string, district: string) =>
    favorites.some(f => f.name === name && f.district === district),
    [favorites],
  );

  const remove = useCallback((name: string, district: string) => {
    setFavorites(prev => {
      const next = prev.filter(f => !(f.name === name && f.district === district));
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setFavorites([]);
    save([]);
  }, []);

  return { favorites, toggle, isFavorite, remove, clear };
}
