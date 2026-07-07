/**
 * 백그라운드 갱신 전용 엔드포인트
 *
 * POST /api/cron/refresh-dashboard
 *
 * 무거운 대시보드 집계(computeDashboardData)를 실제로 실행하고
 * 결과를 인메모리 캐시 + Supabase에 저장한다. 사용자 요청 경로가 아니라
 * 외부 스케줄러(GitHub Actions 등, 주기적으로 curl)가 호출하는 용도.
 * Vercel Hobby 플랜은 Cron이 하루 1회로 제한되어 Vercel Cron 대신 사용.
 *
 * x-cron-secret 헤더가 CRON_SECRET 환경변수와 일치해야 실행된다.
 */
import { Router, type Request, type Response } from 'express';
import { computeDashboardData } from '../services/dashboardAggregator.js';
import { cache, TTL } from '../services/cache.js';
import { supabaseAdmin, DASHBOARD_CACHE_TABLE } from '../services/supabaseAdmin.js';

const router = Router();
const MASTER_KEY = 'dashboard:v1';

router.post('/refresh-dashboard', async (req: Request, res: Response) => {
  const expected = process.env.CRON_SECRET;
  const provided = req.header('x-cron-secret');
  if (!expected || provided !== expected) {
    return res.status(401).json({ success: false, error: 'unauthorized' });
  }

  try {
    const data = await computeDashboardData();
    cache.set(MASTER_KEY, data, TTL.MASTER);

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from(DASHBOARD_CACHE_TABLE)
        .upsert({ key: MASTER_KEY, data, updated_at: new Date().toISOString() });
      if (error) {
        console.error('[/api/cron/refresh-dashboard] Supabase 저장 실패', error);
        return res.status(500).json({ success: false, error: 'Supabase 저장 실패' });
      }
    }

    return res.json({ success: true, refreshedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[/api/cron/refresh-dashboard]', err);
    return res.status(500).json({ success: false, error: '대시보드 갱신 실패' });
  }
});

export default router;
