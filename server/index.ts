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
    molitApiKey: process.env.MOLIT_API_KEY ? '설정됨' : '❌ 미설정 - .env에 MOLIT_API_KEY 추가 필요',
    rebApiKey: process.env.REB_API_KEY ? '설정됨' : '⚠️ 미설정 - sample 키 사용 (10건 제한)',
    cacheEntries: cache.size(),
    uptime: process.uptime(),
  });
});

// ── API 키 확인 미들웨어 ──────────────────────────────────────────
app.use('/api', (req, res, next) => {
  if (!process.env.MOLIT_API_KEY) {
    console.warn('⚠️  MOLIT_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.');
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
  if (!process.env.MOLIT_API_KEY) {
    console.log(`\n⚠️  MOLIT_API_KEY 미설정`);
    console.log(`   1. https://www.data.go.kr 에서 API 키 발급`);
    console.log(`   2. .env 파일에 MOLIT_API_KEY=발급받은키 추가\n`);
  } else {
    console.log(`   API Key: ${process.env.MOLIT_API_KEY.slice(0, 8)}...`);
  }
});

export default app;
