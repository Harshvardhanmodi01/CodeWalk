'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import FloatingBatchProgress from '@/components/dashboard/FloatingBatchProgress';
import { useGlobal } from '@/app/context/GlobalContext';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading } = useGlobal();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  // Safety fallback: if authLoading is still true after 3s, redirect to login.
  // This prevents an infinite spinner if GlobalContext silently fails.
  const [timedOut, setTimedOut] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Auth gate: once auth is resolved (or timed out), redirect if no user.
  useEffect(() => {
    if (!mounted) return;
    if (!authLoading && !user) {
      router.replace('/login');
    }
    if (timedOut && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, timedOut, mounted, router]);

  // Show spinner while auth is still being determined
  if (!mounted || (authLoading && !user && !timedOut)) {
    return (
      <div className="min-h-screen bg-[#0d1515] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00dbe9]"></div>
      </div>
    );
  }

  // If auth resolved with no user, render nothing (redirect effect will fire)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface flex overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-[#192122] border-b border-[#3b494b] text-white fixed top-0 left-0 right-0 z-30 h-16 select-none">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-cyan-500/20">
            CW
          </span>
          <span className="font-bold text-base tracking-tight text-white font-mono">
            CodeWalk
          </span>
        </div>

        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-1 text-[#b9cacb] hover:text-white transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
      </div>

      {/* Side Navigation Drawer */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 ml-0 lg:ml-sidebar-width flex flex-col min-h-screen relative overflow-hidden pt-16 lg:pt-0">
        {children}
      </div>

      {/* Floating bulk worker progress bar */}
      <FloatingBatchProgress />
    </div>
  );
}
