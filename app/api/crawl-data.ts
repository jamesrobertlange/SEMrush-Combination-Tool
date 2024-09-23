// pages/api/crawl-data.ts

import { NextApiRequest, NextApiResponse } from 'next';

const storage = new Storage();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', pageSize = '100' } = req.query;
  const pageNumber = parseInt(page as string, 10);
  const pageSizeNumber = parseInt(pageSize as string, 10);

  try {
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || '');
    const file = bucket.file('processed_crawl_data.json');
    
    const [content] = await file.download();
    const data = JSON.parse(content.toString());

    const startIndex = (pageNumber - 1) * pageSizeNumber;
    const endIndex = startIndex + pageSizeNumber;
    const paginatedData = data.slice(startIndex, endIndex);

    res.status(200).json({
      data: paginatedData,
      totalCount: data.length,
      page: pageNumber,
      pageSize: pageSizeNumber,
    });
  } catch (error) {
    console.error('Error fetching crawl data:', error);
    res.status(500).json({ error: 'Error fetching crawl data' });
  }
}