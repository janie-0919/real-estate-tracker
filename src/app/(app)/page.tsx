import { Suspense } from 'react';
import HomePage from '@/screens/Home/HomePage';

export default function Home() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
