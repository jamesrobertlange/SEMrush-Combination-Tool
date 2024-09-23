// app/crawl-map/page.tsx

'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const InteractiveCrawlMap = dynamic(() => import('../components/InteractiveCrawlMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});


export default function CrawlMapPage() {
  return (
    <div className="w-full px-4">
      <title>Crawl Map</title>
      <h1 className="text-2xl font-bold mb-4">Crawl Map</h1>
      <div className="mt-4">
        <InteractiveCrawlMap />
      </div>
    </div>
  );
}