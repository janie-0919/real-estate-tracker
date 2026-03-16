import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import transactionRouter from './routes/transactions.js';
import listingRouter from './routes/listings.js';
import priceIndexRouter from './routes/priceIndex.js';
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
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/transactions', transactionRouter);
app.use('/api/listings', listingRouter);
app.use('/api/price-index', priceIndexRouter);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    rebApiKey: process.env.REB_API_KEY ? '설정됨' : '❌ 미설정 - .env에 REB_API_KEY 추가 필요',
    cacheEntries: cache.size(),
    uptime: process.uptime(),
  });
});

// ── API 키 확인 미들웨어 ──────────────────────────────────────────
app.use('/api', (_req, _res, next) => {
  if (!process.env.REB_API_KEY) {
    console.warn('⚠️  REB_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  next();
});

// ── Scheduled cache warm-up ───────────────────────────────────────
// 매일 오전 1시 캐시 초기화 (새 데이터로 갱신)
cron.schedule('0 1 * * *', () => {
  console.log('[CRON] 캐시 초기화');
  cache.clear();
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏠 부동산 트래커 서버 시작`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  if (!process.env.REB_API_KEY) {
    console.log(`\n⚠️  REB_API_KEY 미설정`);
    console.log(`   1. https://www.data.go.kr 에서 B552554(한국부동산원) 서비스 신청 후 인증키 발급`);
    console.log(`   2. https://www.reb.or.kr/r-one 에서 통계 API 인증키 발급`);
    console.log(`   3. .env 파일에 REB_API_KEY=발급받은키 추가\n`);
  } else {
    console.log(`   REB API Key: ${process.env.REB_API_KEY.slice(0, 8)}...`);
  }
});

export default app;
