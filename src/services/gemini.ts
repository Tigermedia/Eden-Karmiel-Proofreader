/**
 * Gemini API Service for Hebrew text extraction and proofreading
 * Uses Gemini 2.0 Flash for reading Hebrew from PDF images
 */

import type {
  ExtractedTombstoneText,
  ProofreadingIssue,
  MemorialEntry,
} from '../types/proofreader';
import { blobToBase64 } from '../utils/pdfToImage';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

if (!GEMINI_API_KEY) {
  console.warn('Warning: VITE_GEMINI_API_KEY is not set. Proofreading will not work.');
}

// Structured prompt for Hebrew tombstone analysis
const PROOFREADING_PROMPT = `אתה מומחה להגהת טקסטים עבריים על מצבות. נא לנתח את התמונה הזו ולהחזיר JSON בלבד.

## חשוב - זיהוי מבנה:
התמונה עשויה להכיל מספר חלקים/פאנלים נפרדים של מצבות (למשל 2-3 מצבות בתמונה אחת).
זהה כל חלק בנפרד והפרד ביניהם ב-rawText עם קו מפריד: "────────────────"

## משימות:
1. חלץ את כל הטקסט העברי מהתמונה - קרא כל מילה בדיוק כפי שהיא מופיעה
2. זהה כל חלק/פאנל בתמונה בנפרד (אם יש מספר מצבות בתמונה)
3. זהה את מבנה כל מצבה (כותרת משפחה, הנצחות נפרדות לכל נפטר)
4. בדוק שגיאות כתיב ודקדוק
5. וודא שהקיצורים נכונים
6. זהה ציטוטים תנ"כיים ובדוק דיוקם

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
    "rawText": "כל הטקסט כפי שנקרא מהתמונה - מילה במילה",
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

חשוב:
1. החזר JSON בלבד, ללא טקסט נוסף לפני או אחרי
2. קרא את הטקסט בדיוק כפי שהוא מופיע בתמונה`;

export interface GeminiProofreadResult {
  success: boolean;
  extractedText?: ExtractedTombstoneText;
  issues?: ProofreadingIssue[];
  error?: string;
  rawResponse?: string;
}

/**
 * Send image to Gemini for Hebrew text extraction and proofreading
 */
export async function proofreadImageWithGemini(imageBlob: Blob): Promise<GeminiProofreadResult> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      error: 'Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in .env.local',
    };
  }

  try {
    const base64Image = await blobToBase64(imageBlob);

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROOFREADING_PROMPT },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return {
        success: false,
        error: `API Error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return {
        success: false,
        error: 'No text content in Gemini response',
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
        error: 'Failed to parse Gemini response as JSON',
        rawResponse: textContent,
      };
    }
  } catch (error) {
    console.error('Gemini proofreading error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}
