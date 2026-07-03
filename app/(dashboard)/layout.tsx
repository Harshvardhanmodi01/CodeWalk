'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import FloatingBatchProgress from '@/components/dashboard/FloatingBatchProgress';
import { useGlobal } from '@/app/context/GlobalContext';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useGlobal();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Check Supabase session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.replace('/login');
        } else {
          setAuthLoading(false);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        window.location.replace('/login');
      }
    };
    checkSession();
  }, []);

  if (!mounted || authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0d1515] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00dbe9]"></div>
      </div>
    );
  }

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
