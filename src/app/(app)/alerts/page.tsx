import { Suspense } from 'react';
import AlertsPage from '@/screens/Alerts/AlertsPage';

export default function Alerts() {
  return (
    <Suspense>
      <AlertsPage />
    </Suspense>
  );
}
