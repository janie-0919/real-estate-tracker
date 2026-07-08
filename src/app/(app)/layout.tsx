import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import styles from '@/components/layout/RootLayout.module.scss';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <Suspense>
        <Header />
      </Suspense>
      <div className={styles.body}>
        <Suspense>
          <Sidebar />
        </Suspense>
        <main className={styles.main}>
          <div className={styles.content}>{children}</div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
