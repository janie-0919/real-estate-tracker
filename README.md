# 🏠 부동산 트래커

국토교통부 실거래 공공데이터 기반 아파트 시세 분석 플랫폼

**[live →](https://real-estate-tracker-nine.vercel.app)**

---

## 주요 기능

- 서울 및 전국 아파트 실거래가 조회
- 지역별 평균·최고·최저 가격 현황
- 단지별 실거래 통계 및 가격 추이
- 관심 매물 등록 및 알림 설정

---

## 기술 스택

### Frontend
| | |
|---|---|
| Framework | React 18 |
| Language | TypeScript |
| Build | Vite |
| Routing | React Router v6 |
| Server State | TanStack Query (React Query) |
| Styling | SCSS Modules |
| Charts | Recharts |

### Backend
| | |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Language | TypeScript |
| Data Source | 국토교통부 실거래 API (data.go.kr) |

### Infrastructure
| | |
|---|---|
| Hosting | Vercel |
| Auth / DB | Supabase |

---

## 로컬 실행

```bash
# 프론트엔드
npm install
npm run dev

# 백엔드 (별도 터미널)
cd server && npm install
cp .env.example .env   # DATA_GO_KR_API_KEY 설정
npm run dev
```

> `DATA_GO_KR_API_KEY` : [data.go.kr](https://www.data.go.kr) 에서 아파트매매 실거래 API 신청 후 발급
