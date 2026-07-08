import { Suspense } from 'react';
import ComplexDetailPage from '@/screens/ComplexDetail/ComplexDetailPage';

export default function ComplexDetail() {
  return (
    <Suspense>
      <ComplexDetailPage />
    </Suspense>
  );
}
