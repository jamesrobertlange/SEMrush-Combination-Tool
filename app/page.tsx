'use client';

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

interface CsvRow {
  Keyword: string;
  Position: string;
  'Search Volume': string;
  'Keyword Intents': string;
  URL: string;
  Traffic: string;
  Timestamp: string;
  date: string;
  branded: boolean;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [brandedTerms, setBrandedTerms] = useState('');
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [progress, setProgress] = useState(0);

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

  const processCsvFiles = async (files: File[]): Promise<CsvRow[]> => {
    let combinedData: CsvRow[] = [];

    for (const file of files) {
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(file);
      });

      const { data } = await new Promise<Papa.ParseResult<CsvRow>>((resolve) => {
        Papa.parse<CsvRow>(text, {
          header: true,
          complete: (results) => resolve(results),
          transform: (value) => value.trim(),
        });
      });

      combinedData = combinedData.concat(data);
      setProgress((prev) => prev + (1 / files.length) * 50);
    }

    return combinedData;
  };

  const processData = (data: CsvRow[], brandedTerms: string[]): CsvRow[] => {
    let topPages = data.filter(row => parseInt(row.Position) < 11);

    const uniquePages = new Map<string, CsvRow>();
    topPages.forEach(row => {
      const key = `${row.Keyword}-${row.URL}`;
      if (!uniquePages.has(key) || parseInt(row.Traffic) > parseInt(uniquePages.get(key)!.Traffic)) {
        uniquePages.set(key, row);
      }
    });
    topPages = Array.from(uniquePages.values());

    topPages.sort((a, b) => parseInt(b.Traffic) - parseInt(a.Traffic));

    const brandedRegex = new RegExp(brandedTerms.map(term => `\\b${term.replace(/\s+/g, '\\s+')}\\b`).join('|'), 'i');
    topPages = topPages.map(row => {
      const date = new Date(row.Timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return {
        ...row,
        date: `${year}-${month}-01`,
        branded: brandedRegex.test(row.Keyword),
      };
    });

    const selectedColumns: (keyof CsvRow)[] = ['Keyword', 'Position', 'Search Volume', 'Keyword Intents', 'URL', 'Traffic', 'date', 'branded'];
    return topPages.map(row => 
      selectedColumns.reduce((obj, key) => ({ ...obj, [key]: row[key] }), {} as CsvRow)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeElapsed(0);
    setProgress(0);

    const brandedTermsList = brandedTerms.split(',').map(term => term.trim().toLowerCase());

    try {
      const combinedData = await processCsvFiles(files);
      setProgress(50);

      const processedData = processData(combinedData, brandedTermsList);
      setProgress(75);

      const csvData = Papa.unparse(processedData);
      setProgress(90);

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date();
      const formattedDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const fileName = `${clientName.toLowerCase().replace(/\s+/g, '_')}-${formattedDate}-semrush.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setProgress(100);
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while processing the CSV files. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">CSV Processor</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="clientName" className="block mb-2">Client Name:</label>
          <input
            type="text"
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full p-2 border rounded bg-[var(--input-bg)] text-[var(--input-text)]"
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
            className="w-full p-2 border rounded bg-[var(--input-bg)] text-[var(--input-text)]"
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
            className="w-full p-2 border rounded bg-[var(--input-bg)] text-[var(--input-text)]"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-[var(--button-bg)] text-[var(--button-text)] px-4 py-2 rounded disabled:bg-gray-400"
        >
          {isLoading ? 'Processing...' : 'Process CSV'}
        </button>
      </form>
      {isLoading && (
        <div className="mt-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--text)]"></div>
            <span>Processing... Time elapsed: {timeElapsed} seconds</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${progress}%`}}></div>
          </div>
          <p className="mt-2 text-center text-sm text-gray-400">
            Progress: {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
}