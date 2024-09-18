'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body>
        <div className="flex h-screen bg-[var(--background)]">
          {/* Side Menu */}
          <div className="w-64 bg-[var(--sidebar-bg)] shadow-md">
            <div className="p-4">
              <h2 className="text-xl font-bold text-[var(--sidebar-text)]">Menu</h2>
            </div>
            <nav className="mt-4">
              <Link 
                href="/"
                className={`block py-2 px-4 text-sm hover:bg-[var(--sidebar-hover)] ${pathname === '/' ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text)]' : 'text-[var(--sidebar-text)]'}`}
              >
                CSV Processor
              </Link>
              <Link 
                href="/new-app"
                className={`block py-2 px-4 text-sm hover:bg-[var(--sidebar-hover)] ${pathname === '/new-app' ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text)]' : 'text-[var(--sidebar-text)]'}`}
              >
                New App
              </Link>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}