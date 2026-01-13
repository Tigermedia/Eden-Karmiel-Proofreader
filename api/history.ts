import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

interface StoredResult {
  id: string;
  fileName: string;
  fileUrl: string;
  timestamp: string;
  result: {
    extractedText: unknown;
    issues: unknown[];
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, limit = '20' } = req.query;

    // Get single result by ID
    if (id && typeof id === 'string') {
      const result = await kv.get<StoredResult>(`result:${id}`);
      if (!result) {
        return res.status(404).json({ error: 'Result not found' });
      }
      return res.status(200).json({ success: true, result });
    }

    // Get list of recent results
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const ids = await kv.lrange('results:list', 0, limitNum - 1);

    if (!ids || ids.length === 0) {
      return res.status(200).json({ success: true, results: [] });
    }

    // Fetch all results
    const results: StoredResult[] = [];
    for (const resultId of ids) {
      const result = await kv.get<StoredResult>(`result:${resultId}`);
      if (result) {
        results.push(result);
      }
    }

    return res.status(200).json({
      success: true,
      results,
      total: results.length,
    });
  } catch (error) {
    console.error('History error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch history',
    });
  }
}
