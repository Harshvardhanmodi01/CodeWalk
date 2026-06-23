'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'History', path: '/history', icon: 'history' },
    { name: 'Tokens', path: '/tokens', icon: 'analytics' },
    { name: 'Profile', path: '/profile', icon: 'person' },
    { name: 'Pricing', path: '/pricing', icon: 'payments' },
  ];

  const handleNewAssessment = () => {
    router.push('/dashboard');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar-width flex flex-col z-40 bg-surface-container border-r border-outline-variant pt-4">
      {/* Workspace Header */}
      <div className="px-6 py-4 border-b border-outline-variant">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-outline-variant">
            <img 
              className="w-full h-full object-cover" 
              alt="Developer Workspace Avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1v93IvN_EVQ4n8UOu0yJH2rPevtzg5AzUGjssuifFbP-JI2rzdzXzUX1IkReYg2AcJDIPERxiBO6BdhC0PogbvG8UGw_NqUXDAiMClhRnfh7GXK7X2g2T99WNx0VhHd87Z2Q6RA7BOdusRzRovVYp98t-MSdgGjviDLQ1NqF_Oz7fcEUL0oZGfvgcAIDIBi20KJD0Qg0J757OqebZ9BIgMO15n7etmGNP0v2N5dULDJVr-gfFIOUwQaCxE-trBVb6TLLoU3bSrvw"
            />
          </div>
          <div>
            <p className="font-label-sm text-label-sm text-primary-fixed leading-tight font-bold">Developer Workspace</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Git-integrated Session</p>
          </div>
        </div>
        <button 
          onClick={handleNewAssessment}
          className="w-full py-2 px-4 bg-primary-container text-on-primary-container font-label-sm text-label-sm rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Assessment
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        <div className="px-4 mb-2">
          <p className="font-label-sm text-label-sm text-on-surface-variant px-2 mb-2 uppercase tracking-widest opacity-50 text-[10px] font-bold">Navigation</p>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-label-sm text-label-sm transition-all duration-150 ${
                    isActive 
                      ? 'bg-surface-container-highest text-primary-fixed border-l-2 border-primary-fixed font-bold' 
                      : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Sidebar Footer / Logout */}
      <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
        <Link 
          href="/login" 
          className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-variant hover:text-error transition-all duration-200 ease-in-out text-sm font-semibold rounded-lg"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label-sm text-label-sm">Logout</span>
        </Link>
      </div>
    </aside>
  );
}
