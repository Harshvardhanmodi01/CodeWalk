'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { useGlobal } from '@/app/context/GlobalContext';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useGlobal();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // authChecked becomes true after a short grace period to allow Supabase to
  // restore the session on first load. Without this, we'd flash-redirect
  // authenticated users before their session resolves.
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Give Supabase up to 1.5 s to restore an existing session.
    const timer = setTimeout(() => setAuthChecked(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Once we know the user is logged in, cancel the auth-check timer immediately.
  useEffect(() => {
    if (user) setAuthChecked(true);
  }, [user]);

  // Redirect unauthenticated users to /login after the grace period.
  useEffect(() => {
    if (mounted && authChecked && !user) {
      router.replace('/login');
    }
  }, [mounted, authChecked, user, router]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-[#0d1515] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00dbe9]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex overflow-hidden">
      {/* Side Navigation Drawer */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 ml-sidebar-width flex flex-col min-h-screen relative overflow-hidden">
        {children}
      </div>
    </div>
  );
}
