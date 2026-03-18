import { useParams, Navigate } from 'react-router-dom';
import { mockComplexes } from '@/data/mockListings';

export default function ComplexDetailPage() {
  const { id } = useParams<{ id: string }>();
  const complex = mockComplexes.find(c => c.id === id);

  if (!complex) {
    return <Navigate to="/" replace />;
  }

  return (
      <Navigate
          to={`/complex-detail?name=${encodeURIComponent(complex.name)}&district=${encodeURIComponent(complex.district)}`}
          replace
      />
  );
}