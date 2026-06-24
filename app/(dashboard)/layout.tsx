'use client';

import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
