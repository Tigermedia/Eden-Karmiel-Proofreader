import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface SaveResultRequest {
  fileName: string;
  fileBase64: string;
  mimeType: string;
  result: {
    extractedText: unknown;
    issues: unknown[];
  };
}

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, fileBase64, mimeType, result } = req.body as SaveResultRequest;

    if (!fileName || !fileBase64 || !result) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique ID
    const id = `proof-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Convert base64 to buffer for Blob storage
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // Upload file to Vercel Blob
    const blob = await put(`proofreading/${id}/${fileName}`, fileBuffer, {
      access: 'public',
      contentType: mimeType || 'application/octet-stream',
    });

    // Create result record
    const storedResult: StoredResult = {
      id,
      fileName,
      fileUrl: blob.url,
      timestamp: new Date().toISOString(),
      result,
    };

    // Save to KV
    await kv.set(`result:${id}`, storedResult);

    // Add to results list (keep last 100)
    await kv.lpush('results:list', id);
    await kv.ltrim('results:list', 0, 99);

    return res.status(200).json({
      success: true,
      id,
      fileUrl: blob.url,
    });
  } catch (error) {
    console.error('Save result error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save result',
    });
  }
}
