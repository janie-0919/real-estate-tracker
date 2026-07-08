import { Suspense } from 'react';
import FavoritesPage from '@/screens/Favorites/FavoritesPage';

export default function Favorites() {
  return (
    <Suspense>
      <FavoritesPage />
    </Suspense>
  );
}
