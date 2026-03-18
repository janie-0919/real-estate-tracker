import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'favoriteDistricts';
const DEFAULT_FAVORITES = ['서울 강남구', '서울 서초구', '서울 마포구'];

function loadLocal(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // ignore
  }
  return DEFAULT_FAVORITES;
}

function saveLocal(districts: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(districts));
}

export function useFavoriteDistricts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── 비로그인: localStorage ──────────────────────────────────
  const [localFavs, setLocalFavs] = useState<string[]>(loadLocal);

  // ── 로그인: Supabase DB ─────────────────────────────────────
  const { data: dbFavs = [] } = useQuery({
    queryKey: ['favorite-districts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
          .from('favorite_districts')
          .select('district')
          .order('added_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(row => row.district as string);
    },
    enabled: !!user,
  });

  // 로그인 시 localStorage → DB 마이그레이션 (최초 1회)
  useEffect(() => {
    if (!user) return;
    const local = loadLocal();
    const isDefault = JSON.stringify(local) === JSON.stringify(DEFAULT_FAVORITES);
    if (isDefault) return; // 기본값이면 마이그레이션 불필요

    Promise.allSettled(
        local.map(district =>
            supabase.from('favorite_districts').upsert({
              user_id: user.id,
              district,
            }, { onConflict: 'user_id,district' })
        )
    ).then(() => {
      localStorage.removeItem(STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ['favorite-districts', user.id] });
    });
  }, [user?.id]);

  // 실제 사용할 favorites
  const favorites = user ? dbFavs : localFavs;

  // ── toggle ──────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async (district: string) => {
      if (!user) return;
      const exists = dbFavs.includes(district);
      if (exists) {
        await supabase.from('favorite_districts')
            .delete()
            .eq('user_id', user.id)
            .eq('district', district);
      } else {
        await supabase.from('favorite_districts')
            .insert({ user_id: user.id, district });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorite-districts', user?.id] }),
  });

  const toggle = useCallback((district: string) => {
    if (!user) {
      setLocalFavs(prev => {
        const next = prev.includes(district)
            ? prev.filter(d => d !== district)
            : [...prev, district];
        saveLocal(next);
        return next;
      });
    } else {
      toggleMutation.mutate(district);
    }
  }, [user, toggleMutation, dbFavs]);

  // ── isFavorite ──────────────────────────────────────────────
  const isFavorite = useCallback(
      (district: string) => favorites.includes(district),
      [favorites],
  );

  return { favorites, toggle, isFavorite };
}