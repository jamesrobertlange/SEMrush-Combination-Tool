'use client';

import React, { useState, useEffect } from 'react';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [brandedTerms, setBrandedTerms] = useState('');
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setTimeElapsed((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      setTimeElapsed(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeElapsed(0);

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
        const { csvData, fileName } = await response.json();
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error('Error processing CSV');
        alert('An error occurred while processing the CSV. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
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
      {isLoading && (
        <div className="mt-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span>Processing... Time elapsed: {timeElapsed} seconds</span>
          </div>
          <p className="mt-2 text-center text-sm text-gray-500">
            This may take a few minutes depending on the size of your CSV files.
          </p>
        </div>
      )}
    </div>
  );
}