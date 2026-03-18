import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AlertCondition } from '@/types';

// DB 행 → AlertCondition 변환
function rowToAlert(row: Record<string, unknown>): AlertCondition {
    return {
        id: row.id as string,
        name: row.name as string,
        districts: row.districts as string[],
        dealType: row.deal_type as AlertCondition['dealType'],
        priceMax: row.price_max as number | undefined,
        areaMin: row.area_min as number | undefined,
        areaMax: row.area_max as number | undefined,
        floorMin: row.floor_min as number | undefined,
        channels: row.channels as ('web' | 'email')[],
        isActive: row.is_active as boolean,
        createdAt: (row.created_at as string).slice(0, 10),
    };
}

export function useAlerts() {
    const queryClient = useQueryClient();

    // 목록 조회
    const { data: alerts = [], isLoading } = useQuery({
        queryKey: ['alerts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('alerts')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data ?? []).map(rowToAlert);
        },
    });

    // 추가
    const addAlert = useMutation({
        mutationFn: async (form: Omit<AlertCondition, 'id' | 'createdAt'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('로그인이 필요합니다.');
            const { error } = await supabase.from('alerts').insert({
                user_id: user.id,
                name: form.name,
                districts: form.districts,
                deal_type: form.dealType,
                price_max: form.priceMax ?? null,
                area_min: form.areaMin ?? null,
                area_max: form.areaMax ?? null,
                floor_min: form.floorMin ?? null,
                channels: form.channels,
                is_active: form.isActive,
            });
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    });

    // 토글 활성화/비활성화
    const toggleAlert = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await supabase
                .from('alerts')
                .update({ is_active: !isActive })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    });

    // 삭제
    const deleteAlert = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('alerts')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    });

    return {
        alerts,
        isLoading,
        addAlert: addAlert.mutate,
        toggleAlert: (id: string, isActive: boolean) => toggleAlert.mutate({ id, isActive }),
        deleteAlert: deleteAlert.mutate,
    };
}