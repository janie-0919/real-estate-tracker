import { Suspense } from 'react';
import ComplexByNamePage from '@/screens/ComplexDetail/ComplexByNamePage';

export default function ComplexByName() {
  return (
    <Suspense>
      <ComplexByNamePage />
    </Suspense>
  );
}
