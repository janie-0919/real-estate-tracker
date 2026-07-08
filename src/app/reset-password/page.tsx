import { Suspense } from 'react';
import ResetPasswordPage from '@/screens/ResetPassword/ResetPasswordPage';

export default function ResetPassword() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
}
