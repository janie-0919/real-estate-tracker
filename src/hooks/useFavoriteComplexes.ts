import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface FavoriteComplex {
  name: string;
  district: string;
  addedAt: string;
}

const STORAGE_KEY = 'favorite_complexes';

// localStorage 헬퍼
function loadLocal(): FavoriteComplex[] {
  if (typeof window === 'undefined') return []; // SSR 가드
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveLocal(items: FavoriteComplex[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useFavoriteComplexes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── 비로그인: localStorage ──────────────────────────────────
  const [localFavs, setLocalFavs] = useState<FavoriteComplex[]>(loadLocal);

  // ── 로그인: Supabase DB ─────────────────────────────────────
  const { data: dbFavs = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
          .from('favorites')
          .select('*')
          .order('added_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(row => ({
        name: row.complex_name as string,
        district: row.district as string,
        addedAt: row.added_at as string,
      }));
    },
    enabled: !!user,
  });

  // 로그인 시 localStorage → DB 마이그레이션 (최초 1회)
  useEffect(() => {
    if (!user) return;
    const local = loadLocal();
    if (local.length === 0) return;

    // localStorage에 있는 항목을 DB에 추가
    Promise.allSettled(
        local.map(fav =>
            supabase.from('favorites').upsert({
              user_id: user.id,
              complex_name: fav.name,
              district: fav.district,
            }, { onConflict: 'user_id,complex_name,district' })
        )
    ).then(() => {
      localStorage.removeItem(STORAGE_KEY); // 마이그레이션 후 localStorage 비움
      queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
    });
  }, [user?.id]);

  // 실제 사용할 favorites (로그인 여부에 따라 분기)
  const favorites = user ? dbFavs : localFavs;

  // ── toggle ──────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({ name, district }: { name: string; district: string }) => {
      if (!user) return;
      const exists = dbFavs.some(f => f.name === name && f.district === district);
      if (exists) {
        await supabase.from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('complex_name', name)
            .eq('district', district);
      } else {
        await supabase.from('favorites')
            .insert({ user_id: user.id, complex_name: name, district });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] }),
  });

  const toggle = useCallback((name: string, district: string) => {
    if (!user) {
      // 비로그인: localStorage
      setLocalFavs(prev => {
        const exists = prev.some(f => f.name === name && f.district === district);
        const next = exists
            ? prev.filter(f => !(f.name === name && f.district === district))
            : [...prev, { name, district, addedAt: new Date().toISOString() }];
        saveLocal(next);
        return next;
      });
    } else {
      toggleMutation.mutate({ name, district });
    }
  }, [user, toggleMutation, dbFavs]);

  // ── isFavorite ──────────────────────────────────────────────
  const isFavorite = useCallback((name: string, district: string) =>
          favorites.some(f => f.name === name && f.district === district),
      [favorites],
  );

  // ── remove ──────────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: async ({ name, district }: { name: string; district: string }) => {
      if (!user) return;
      await supabase.from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('complex_name', name)
          .eq('district', district);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] }),
  });

  const remove = useCallback((name: string, district: string) => {
    if (!user) {
      setLocalFavs(prev => {
        const next = prev.filter(f => !(f.name === name && f.district === district));
        saveLocal(next);
        return next;
      });
    } else {
      removeMutation.mutate({ name, district });
    }
  }, [user, removeMutation]);

  // ── clear ───────────────────────────────────────────────────
  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from('favorites')
          .delete()
          .eq('user_id', user.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] }),
  });

  const clear = useCallback(() => {
    if (!user) {
      setLocalFavs([]);
      saveLocal([]);
    } else {
      clearMutation.mutate();
    }
  }, [user, clearMutation]);

  return { favorites, toggle, isFavorite, remove, clear };
}