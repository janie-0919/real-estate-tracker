-- 대시보드 집계 결과를 서버리스 콜드스타트와 무관하게 영속 저장하기 위한 테이블.
-- service role 키로만 읽고 쓴다 (RLS 활성화 + 정책 없음 = anon/authenticated 접근 불가).
create table if not exists dashboard_cache (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table dashboard_cache enable row level security;
