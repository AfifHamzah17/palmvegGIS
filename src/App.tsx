import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Skeleton } from './components/ui';

const Home = lazy(() => import('./pages/Home'));
const Peta = lazy(() => import('./pages/Peta'));
const Galeri = lazy(() => import('./pages/Galeri'));
const Fallback = () => <div className="space-y-4 p-6"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="peta" element={<Peta />} />
          <Route path="galeri" element={<Galeri />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
