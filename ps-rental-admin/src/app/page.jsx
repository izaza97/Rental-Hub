'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSavedUser } from '@/lib/clientAuth';

export default function IndexPage() {
  const router = useRouter();
  useEffect(() => {
    const u = getSavedUser();
    router.replace(u ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#1d4ed8', fontWeight: 700 }}>
      Memuat Website Admin PS Rental Hub...
    </div>
  );
}
