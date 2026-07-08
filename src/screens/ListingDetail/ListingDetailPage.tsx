'use client';
import { useParams, Navigate } from '@/compat/router';
import { mockListings } from '@/data/mockListings';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const listing = mockListings.find(l => l.id === id);

  if (!listing) {
    return <Navigate to="/listings" replace />;
  }

  // 단지 상세 페이지로 리다이렉트
  return (
      <Navigate
          to={`/complex-detail?name=${encodeURIComponent(listing.complexName)}&district=${encodeURIComponent(listing.district)}`}
          replace
      />
  );
}