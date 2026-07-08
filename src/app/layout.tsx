import type { Metadata } from 'next';
import '@/styles/global.scss';
import Providers from './providers';

export const metadata: Metadata = {
  title: {
    default: '부동산 트래커 — 실거래가 추적·비교·알림',
    template: '%s | 부동산 트래커',
  },
  description:
    '국토부 아파트 실거래가를 지역·단지별로 추적하고 비교하세요. 실시간 가격 변동, 급매 탐지, 맞춤 알림.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
