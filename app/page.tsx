'use client';

import React, { useState } from 'react';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [brandedTerms, setBrandedTerms] = useState('');
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('brandedTerms', brandedTerms);
    formData.append('clientName', clientName);

    try {
      const response = await fetch('/api/process-csv', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1].replace(/"/g, '') || 'processed_data.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Error processing CSV');
      }
    } catch (error) {
      console.error('Error:', error);
    }

    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">CSV Processor</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="clientName" className="block mb-2">Client Name:</label>
          <input
            type="text"
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full p-2 border rounded text-black"
            required
          />
        </div>
        <div>
          <label htmlFor="files" className="block mb-2">Upload CSV files:</label>
          <input
            type="file"
            id="files"
            multiple
            accept=".csv"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="w-full p-2 border rounded text-black"
            required
          />
        </div>
        <div>
          <label htmlFor="brandedTerms" className="block mb-2">Branded terms (comma-separated):</label>
          <input
            type="text"
            id="brandedTerms"
            value={brandedTerms}
            onChange={(e) => setBrandedTerms(e.target.value)}
            className="w-full p-2 border rounded text-black"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {isLoading ? 'Processing...' : 'Process CSV'}
        </button>
      </form>
    </div>
  );
}