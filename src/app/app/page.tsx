'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AppPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to onboarding
    router.push('/onboarding');
  }, [router]);
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting to onboarding...</p>
    </div>
  );
}
