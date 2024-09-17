import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];
  const brandedTerms = (formData.get('brandedTerms') as string).split(',').map(term => term.trim().toLowerCase());
  const clientName = formData.get('clientName') as string;

  try {
    const combinedData = await processCsvFiles(files);
    const processedData = processData(combinedData, brandedTerms);
    const csvData = stringify(processedData, { 
      header: true,
      cast: {
        boolean: (value) => value ? 'true' : 'false'
      }
    });

    const date = new Date();
    const formattedDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const fileName = `${clientName.toLowerCase().replace(/\s+/g, '_')}-${formattedDate}-semrush.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    return NextResponse.json({ error: 'Error processing CSV' }, { status: 500 });
  }
}

async function processCsvFiles(files: File[]): Promise<any[]> {
  let combinedData: any[] = [];

  for (const file of files) {
    const text = await file.text();
    const records = parse(text, { columns: true, skip_empty_lines: true });
    combinedData = combinedData.concat(records);
  }

  return combinedData;
}

function processData(data: any[], brandedTerms: string[]): any[] {
  // Filter for top pages (Position < 11)
  let topPages = data.filter(row => parseInt(row.Position) < 11);

  // Remove duplicates
  const uniquePages = new Map();
  topPages.forEach(row => {
    const key = `${row.Keyword}-${row.URL}`;
    if (!uniquePages.has(key) || parseInt(row.Traffic) > parseInt(uniquePages.get(key).Traffic)) {
      uniquePages.set(key, row);
    }
  });
  topPages = Array.from(uniquePages.values());

  // Sort by Traffic
  topPages.sort((a, b) => parseInt(b.Traffic) - parseInt(a.Traffic));

  // Process date columns
  topPages = topPages.map(row => {
    const date = new Date(row.Timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return {
      ...row,
      date: `${year}-${month}-01`,
    };
  });

  // Add "Branded" column
  const brandedRegex = new RegExp(brandedTerms.map(term => `\\b${term.replace(/\s+/g, '\\s+')}\\b`).join('|'), 'i');
  topPages = topPages.map(row => ({
    ...row,
    'Branded': brandedRegex.test(row.Keyword),
  }));

  // Select only the required columns
  const selectedColumns = ['Keyword', 'Position', 'Search Volume', 'Keyword Intents', 'URL', 'Traffic', 'date', 'Branded'];
  return topPages.map(row => 
    selectedColumns.reduce((obj, key) => ({ ...obj, [key]: row[key] }), {})
  );
}