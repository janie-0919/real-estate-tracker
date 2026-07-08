import { Suspense } from 'react';
import ListingsPage from '@/screens/Listings/ListingsPage';

export default function Listings() {
  return (
    <Suspense>
      <ListingsPage />
    </Suspense>
  );
}
