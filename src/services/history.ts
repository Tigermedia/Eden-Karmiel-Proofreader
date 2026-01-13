/**
 * History Service - Save and retrieve proofreading results
 */

export interface HistoryEntry {
  id: string;
  fileName: string;
  fileUrl: string;
  timestamp: string;
  result: {
    extractedText: {
      rawText: string;
      familyName?: string;
      memorials?: unknown[];
    };
    issues: unknown[];
  };
}

/**
 * Save a proofreading result to storage
 */
export async function saveResult(
  fileName: string,
  fileBase64: string,
  mimeType: string,
  result: { extractedText: unknown; issues: unknown[] }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch('/api/save-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        fileBase64,
        mimeType,
        result,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to save' };
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error('Save result error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save',
    };
  }
}

/**
 * Get proofreading history
 */
export async function getHistory(limit = 20): Promise<{
  success: boolean;
  results?: HistoryEntry[];
  error?: string;
}> {
  try {
    const response = await fetch(`/api/history?limit=${limit}`);
    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch history' };
    }

    return { success: true, results: data.results };
  } catch (error) {
    console.error('Get history error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch history',
    };
  }
}

/**
 * Get a single result by ID
 */
export async function getResultById(id: string): Promise<{
  success: boolean;
  result?: HistoryEntry;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/history?id=${id}`);
    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Result not found' };
    }

    return { success: true, result: data.result };
  } catch (error) {
    console.error('Get result error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch result',
    };
  }
}

/**
 * Convert Blob to base64 for storage
 */
export async function blobToBase64ForStorage(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
