/**
 * Gemini API Service for Hebrew text extraction and proofreading
 * Calls the serverless API endpoint to keep API key secure
 */

import type {
  ExtractedTombstoneText,
  ProofreadingIssue,
  MemorialEntry,
} from '../types/proofreader';
import { blobToBase64 } from '../utils/pdfToImage';

export interface GeminiProofreadResult {
  success: boolean;
  extractedText?: ExtractedTombstoneText;
  issues?: ProofreadingIssue[];
  error?: string;
  rawResponse?: string;
}

/**
 * Send image to API for Hebrew text extraction and proofreading
 */
export async function proofreadImageWithGemini(imageBlob: Blob): Promise<GeminiProofreadResult> {
  try {
    const base64Image = await blobToBase64(imageBlob);

    const response = await fetch('/api/proofread', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64Image,
        mimeType: imageBlob.type || 'image/png',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API Error:', errorData);
      return {
        success: false,
        error: errorData.error || `API Error: ${response.status}`,
      };
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'No data in response',
        rawResponse: JSON.stringify(result),
      };
    }

    const parsed = result.data;

    // Transform to our types
    const extractedText: ExtractedTombstoneText = {
      rawText: parsed.extractedText?.rawText || '',
      familyName: parsed.extractedText?.familyName,
      memorials: (parsed.extractedText?.memorials || []).map((m: MemorialEntry) => ({
        name: m.name,
        relationship: m.relationship,
        parentNames: m.parentNames,
        hebrewDeathDate: m.hebrewDeathDate,
        gregorianYears: m.gregorianYears,
        quote: m.quote,
      })),
      headerFormulas: parsed.extractedText?.headerFormulas || [],
      footerFormulas: parsed.extractedText?.footerFormulas || [],
    };

    const issues: ProofreadingIssue[] = (parsed.issues || []).map(
      (issue: ProofreadingIssue, index: number) => ({
        id: `issue-${Date.now()}-${index}`,
        category: issue.category,
        severity: issue.severity,
        originalText: issue.originalText,
        suggestedFix: issue.suggestedFix,
        explanation: issue.explanation,
      })
    );

    return {
      success: true,
      extractedText,
      issues,
    };
  } catch (error) {
    console.error('Proofreading error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if API is available (always true now since we use server-side API)
 */
export function isGeminiConfigured(): boolean {
  return true;
}
