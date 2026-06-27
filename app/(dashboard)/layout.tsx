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

  useEffect(() => {
    setMounted(true);
  }, []);

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
