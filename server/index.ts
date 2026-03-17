import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import cron from 'node-cron';
import transactionRouter from './routes/transactions.js';
import listingRouter from './routes/listings.js';
import priceIndexRouter from './routes/priceIndex.js';
import rebMarketRouter from './routes/rebMarket.js';
import { cache } from './services/cache.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ── Request logger ────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/transactions', transactionRouter);
app.use('/api/listings', listingRouter);
app.use('/api/price-index', priceIndexRouter);
app.use('/api/reb/market', rebMarketRouter);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    rebApiKey: process.env.REB_API_KEY ? '설정됨' : '❌ 미설정 - .env에 REB_API_KEY 추가 필요',
    cacheEntries: cache.size(),
    uptime: process.uptime(),
  });
});

// ── API 키 확인 미들웨어 ──────────────────────────────────────────
app.use('/api', (_req: Request, _res: Response, next: NextFunction) => {
  if (!process.env.REB_API_KEY) {
    console.warn('⚠️  REB_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  next();
});

// ── Scheduled cache warm-up ───────────────────────────────────────
// 매일 오전 1시 캐시 초기화 (로컬 서버 전용 - serverless 환경에서는 실행 안 됨)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CRON === 'true') {
  cron.schedule('0 1 * * *', () => {
    console.log('[CRON] 캐시 초기화');
    cache.clear();
  });
}

export default app;

// ── Start (로컬 개발 전용) ─────────────────────────────────────────
// Vercel serverless에서는 이 블록이 실행되지 않음
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🏠 부동산 트래커 서버 시작`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    if (!process.env.REB_API_KEY) {
      console.log(`\n⚠️  REB_API_KEY 미설정`);
    } else {
      console.log(`   REB API Key: ${process.env.REB_API_KEY.slice(0, 8)}...`);
    }
  });
}
