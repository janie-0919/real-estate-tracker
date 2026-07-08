import { Suspense } from 'react';
import DistrictsPage from '@/screens/Districts/DistrictsPage';

export default function Districts() {
  return (
    <Suspense>
      <DistrictsPage />
    </Suspense>
  );
}
