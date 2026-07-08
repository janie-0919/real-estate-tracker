import { Suspense } from 'react';
import LoginPage from '@/screens/Login/LoginPage';

export default function Login() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
