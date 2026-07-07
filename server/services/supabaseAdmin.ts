/**
 * 서버 전용 Supabase 클라이언트 (service role)
 *
 * 대시보드 집계 결과를 서버리스 함수 재시작(콜드스타트)과 무관하게
 * 영속 저장하기 위한 용도. service role 키는 RLS를 우회하므로
 * 절대 클라이언트(프론트엔드)에 노출하지 말 것 — 서버 프로세스에서만 사용.
 *
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 설정되지 않은 경우
 * null을 반환해 호출부에서 안전하게 폴백(라이브 계산)하도록 한다.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;

if (!supabaseAdmin) {
  console.warn(
    '[supabaseAdmin] SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 미설정 — ' +
    '대시보드 영속 캐시 없이 동작합니다 (콜드스타트마다 느려질 수 있음)',
  );
}

export const DASHBOARD_CACHE_TABLE = 'dashboard_cache';
