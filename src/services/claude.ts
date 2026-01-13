/**
 * Claude API Service for Hebrew text extraction and proofreading
 * Uses Claude Vision API for reading Hebrew from PDF images
 */

import type {
  ExtractedTombstoneText,
  ProofreadingIssue,
  MemorialEntry,
} from '../types/proofreader';
import { blobToBase64 } from '../utils/pdfToImage';

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || '';
// Use Vite proxy in dev, direct URL in production
const API_URL = '/api/claude/v1/messages';

if (!CLAUDE_API_KEY) {
  console.warn('Warning: VITE_CLAUDE_API_KEY is not set. Proofreading will not work.');
}

// Structured prompt for Hebrew tombstone analysis
const PROOFREADING_PROMPT = `אתה מומחה להגהת טקסטים עבריים על מצבות. נא לנתח את התמונה הזו ולהחזיר JSON בלבד.

## משימות:
1. חלץ את כל הטקסט העברי מהתמונה
2. זהה את מבנה המצבה (כותרת משפחה, הנצחות נפרדות לכל נפטר)
3. בדוק שגיאות כתיב ודקדוק
4. וודא שהקיצורים נכונים
5. זהה ציטוטים תנ"כיים ובדוק דיוקם

## קיצורים נפוצים שצריכים לבדוק:
- פ"נ = פה נטמן/נטמנה (לא פ״נ או פנ)
- ז"ל = זכרונו/ה לברכה
- ת.נ.צ.ב.ה = תהא נשמתו/ה צרורה בצרור החיים
- ב"ר = בן/בת רבי
- נפ' = נפטר/ה

## בדיקות דקדוק:
- התאמת מין: בן לזכר, בת לנקבה
- נפטר לזכר, נפטרה לנקבה
- זכרונו לזכר, זכרונה לנקבה
- סמיכות נכונה
- כתיב עקבי

## פורמט JSON נדרש:
{
  "extractedText": {
    "rawText": "כל הטקסט כפי שנקרא",
    "familyName": "שם המשפחה מהכותרת",
    "memorials": [
      {
        "name": "שם הנפטר",
        "relationship": "בעלי, אבינו, סבנו וחמנו היקר",
        "parentNames": "בן/בת פלוני ופלונית",
        "hebrewDeathDate": "י\"א סיון תשע\"ט",
        "gregorianYears": "1938 - 2019",
        "quote": "ציטוט או פסוק אם יש"
      }
    ],
    "headerFormulas": ["פ\"נ"],
    "footerFormulas": ["ת.נ.צ.ב.ה"]
  },
  "issues": [
    {
      "category": "spelling|grammar|abbreviation|quote_accuracy|missing_element",
      "severity": "error|warning|suggestion",
      "originalText": "הטקסט הבעייתי",
      "suggestedFix": "התיקון המוצע",
      "explanation": "הסבר בעברית"
    }
  ]
}

חשוב: החזר JSON בלבד, ללא טקסט נוסף לפני או אחרי.`;

export interface ClaudeProofreadResult {
  success: boolean;
  extractedText?: ExtractedTombstoneText;
  issues?: ProofreadingIssue[];
  error?: string;
  rawResponse?: string;
}

/**
 * Send image to Claude for Hebrew text extraction and proofreading
 */
export async function proofreadImage(imageBlob: Blob): Promise<ClaudeProofreadResult> {
  if (!CLAUDE_API_KEY) {
    return {
      success: false,
      error: 'Claude API key is not configured. Please set VITE_CLAUDE_API_KEY in .env.local',
    };
  }

  try {
    const base64Image = await blobToBase64(imageBlob);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROOFREADING_PROMPT },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API Error:', errorText);
      return {
        success: false,
        error: `API Error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    const textContent = result.content?.[0]?.text;

    if (!textContent) {
      return {
        success: false,
        error: 'No text content in Claude response',
        rawResponse: JSON.stringify(result),
      };
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: 'Could not find JSON in response',
          rawResponse: textContent,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

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
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        success: false,
        error: 'Failed to parse Claude response as JSON',
        rawResponse: textContent,
      };
    }
  } catch (error) {
    console.error('Proofreading error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if Claude API is configured
 */
export function isClaudeConfigured(): boolean {
  return !!CLAUDE_API_KEY;
}
