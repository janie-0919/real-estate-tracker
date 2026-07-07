/**
 * 대시보드 전용 통합 API
 *
 * GET /api/dashboard
 *
 * ✅ 성능 전략 (2026-07 개편):
 *   이전에는 요청이 들어올 때마다 공공 API를 직접 스캔했기 때문에
 *   서버리스 콜드스타트 시 캐시가 비어 있으면 최대 40초까지 걸렸다.
 *   지금은 사용자 요청 경로에서 외부 API를 직접 호출하지 않는다:
 *     1. 인메모리 캐시 확인 (같은 컨테이너가 살아있는 동안 즉시 응답)
 *     2. Supabase에 영속 저장된 최신 집계 결과 조회 (콜드스타트에도 생존, 보통 수백 ms)
 *     3. 위 두 곳 모두 비어있는 최초 1회에 한해서만 라이브 계산 + 저장
 *   실제 집계 계산은 server/services/dashboardAggregator.ts 로 분리했고,
 *   그 계산은 /api/cron/refresh-dashboard 를 통해 외부 스케줄러(예: GitHub Actions)가
 *   주기적으로 미리 실행해 Supabase를 갱신해둔다.
 */
import { Router, type Request, type Response } from 'express';
import { computeDashboardData, type DashboardData } from '../services/dashboardAggregator.js';
import { cache, TTL } from '../services/cache.js';
import { supabaseAdmin, DASHBOARD_CACHE_TABLE } from '../services/supabaseAdmin.js';

const router = Router();

const MASTER_KEY = 'dashboard:v1';

// Vercel Edge에서 응답을 캐싱해 서버리스 함수의 인메모리 캐시가 콜드스타트로
// 날아가도 외부 API를 다시 두드리지 않도록 함.
// s-maxage: 1시간 동안은 Edge가 즉시 응답. 그 이후에도 stale-while-revalidate
// 기간(24시간) 동안은 예전 데이터를 즉시 내려주고 백그라운드에서 갱신.
const DASHBOARD_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';

router.get('/', async (_req: Request, res: Response) => {
  try {
    // ── 1) 인메모리 캐시 (같은 컨테이너가 살아있는 동안 가장 빠름) ──
    const memCached = cache.get<DashboardData>(MASTER_KEY);
    if (memCached) {
      res.set('Cache-Control', DASHBOARD_CACHE_CONTROL);
      return res.json({ success: true, data: memCached, cached: true, source: 'memory' });
    }

    // ── 2) Supabase 영속 캐시 (콜드스타트에도 생존) ──────────────
    if (supabaseAdmin) {
      const { data: row, error } = await supabaseAdmin
        .from(DASHBOARD_CACHE_TABLE)
        .select('data, updated_at')
        .eq('key', MASTER_KEY)
        .maybeSingle();

      if (error) {
        console.error('[/api/dashboard] Supabase 조회 실패', error);
      } else if (row) {
        cache.set(MASTER_KEY, row.data, TTL.MASTER);
        res.set('Cache-Control', DASHBOARD_CACHE_CONTROL);
        return res.json({ success: true, data: row.data, cached: true, source: 'db', updatedAt: row.updated_at });
      }
    }

    // ── 3) 최초 1회 라이브 계산 (여기서만 외부 API를 두드림) ─────
    console.warn('[/api/dashboard] 캐시 미스 — 라이브 계산 수행 (느릴 수 있음)');
    const data = await computeDashboardData();
    cache.set(MASTER_KEY, data, TTL.MASTER);
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from(DASHBOARD_CACHE_TABLE)
        .upsert({ key: MASTER_KEY, data, updated_at: new Date().toISOString() });
      if (error) console.error('[/api/dashboard] Supabase 저장 실패', error);
    }

    res.set('Cache-Control', DASHBOARD_CACHE_CONTROL);
    return res.json({ success: true, data, cached: false, source: 'live' });
  } catch (err) {
    console.error('[/api/dashboard]', err);
    // 실패 응답은 Edge에 캐싱되지 않도록 명시
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ success: false, error: '대시보드 데이터 조회 실패' });
  }
});

export default router;
