import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/components/layout/RootLayout';
import HomePage from '@/pages/Home/HomePage';
import ListingsPage from '@/pages/Listings/ListingsPage';
import ListingDetailPage from '@/pages/ListingDetail/ListingDetailPage';
import ComplexDetailPage from '@/pages/ComplexDetail/ComplexDetailPage';
import FavoritesPage from '@/pages/Favorites/FavoritesPage';
import AlertsPage from '@/pages/Alerts/AlertsPage';
import LoginPage from '@/pages/Login/LoginPage';
import NotFoundPage from '@/pages/NotFound/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'listings', element: <ListingsPage /> },
      { path: 'listings/:id', element: <ListingDetailPage /> },
      { path: 'complex/:id', element: <ComplexDetailPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'alerts', element: <AlertsPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
