import { Suspense } from 'react';
import HomePage from '@/screens/Home/HomePage';
import { api } from '@/services/api';

// 빌드 타임(앱이 아직 떠 있지 않은 시점)에 자체 API를 프리렌더링용으로 fetch하면
// 실패하므로, 매 요청마다 서버에서 렌더링해 실거래 데이터를 항상 최신으로 채운다.
export const dynamic = 'force-dynamic';

export default async function Home() {
  // 서버에서 미리 가져와 최초 HTML에 실데이터가 포함되도록 함 (크롤러/SEO 대응)
  // 실패해도 페이지가 죽지 않도록 폴백: 클라이언트에서 재요청됨
  const dashboard = await api.getDashboard().catch(() => undefined);

  return (
    <Suspense>
      <HomePage initialDashboard={dashboard} />
    </Suspense>
  );
}
