'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/register');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0d1515] flex items-center justify-center text-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#06B6D4] mr-3"></div>
      <p className="text-xs font-mono">Redirecting to register...</p>
    </div>
  );
}
