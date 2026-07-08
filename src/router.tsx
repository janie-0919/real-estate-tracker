import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/components/layout/RootLayout';
import HomePage from '@/screens/Home/HomePage';
import ListingsPage from '@/screens/Listings/ListingsPage';
import ListingDetailPage from '@/screens/ListingDetail/ListingDetailPage';
import ComplexDetailPage from '@/screens/ComplexDetail/ComplexDetailPage';
import ComplexByNamePage from '@/screens/ComplexDetail/ComplexByNamePage';
import DistrictsPage from '@/screens/Districts/DistrictsPage';
import FavoritesPage from '@/screens/Favorites/FavoritesPage';
import AlertsPage from '@/screens/Alerts/AlertsPage';
import LoginPage from '@/screens/Login/LoginPage';
import ResetPasswordPage from '@/screens/ResetPassword/ResetPasswordPage';
import NotFoundPage from '@/screens/NotFound/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'listings', element: <ListingsPage /> },
      { path: 'listings/:id', element: <ListingDetailPage /> },
      { path: 'complex/:id', element: <ComplexDetailPage /> },
      { path: 'complex-detail', element: <ComplexByNamePage /> },
      { path: 'districts', element: <DistrictsPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'alerts', element: <AlertsPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
