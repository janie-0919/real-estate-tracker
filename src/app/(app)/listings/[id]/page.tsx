import { Suspense } from 'react';
import ListingDetailPage from '@/screens/ListingDetail/ListingDetailPage';

export default function ListingDetail() {
  return (
    <Suspense>
      <ListingDetailPage />
    </Suspense>
  );
}
