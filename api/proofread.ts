import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

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
        "hebrewDeathDate": "י\\"א סיון תשע\\"ט",
        "gregorianYears": "1938 - 2019",
        "quote": "ציטוט או פסוק אם יש"
      }
    ],
    "headerFormulas": ["פ\\"נ"],
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
  }

  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

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
                  mime_type: mimeType || 'image/png',
                  data: imageBase64,
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
      return res.status(response.status).json({
        error: `Gemini API Error: ${response.status}`,
        details: errorText
      });
    }

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return res.status(500).json({
        error: 'No text content in Gemini response',
        rawResponse: result
      });
    }

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({
        error: 'Could not find JSON in response',
        rawResponse: textContent
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: parsed });

  } catch (error) {
    console.error('Proofread API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
