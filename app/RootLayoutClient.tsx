'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body>
        <div className="flex h-screen bg-[var(--background)]">
          {/* Side Menu with Dark Background */}
          <div className="w-64 bg-gray-800 shadow-md">
            <div className="p-4">
              <h2 className="text-xl font-bold text-white">Menu</h2>
            </div>
            <nav className="mt-4">
              <Link 
                href="/"
                className={`block py-2 px-4 text-sm hover:bg-gray-700 ${pathname === '/' ? 'bg-gray-700 text-white' : 'text-gray-300'}`}
              >
                Home
              </Link>
              <Link 
                href="/crawl-map"
                className={`block py-2 px-4 text-sm hover:bg-gray-700 ${pathname === '/crawl-map' ? 'bg-gray-700 text-white' : 'text-gray-300'}`}
              >
                Crawl Map
              </Link>
              <Link 
                href="/new-app"
                className={`block py-2 px-4 text-sm hover:bg-gray-700 ${pathname === '/new-app' ? 'bg-gray-700 text-white' : 'text-gray-300'}`}
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