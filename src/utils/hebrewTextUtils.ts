/**
 * Hebrew Text Utilities
 * Parsing and validation helpers for Hebrew memorial text
 */

// Hebrew letter to numeric value mapping (Gematria)
const HEBREW_LETTER_VALUES: Record<string, number> = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5,
  'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
  'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40,
  'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70, 'פ': 80,
  'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200,
  'ש': 300, 'ת': 400,
};

// Hebrew month names with variations
export const HEBREW_MONTHS: Record<string, number> = {
  'ניסן': 1,
  'אייר': 2,
  'סיון': 3, 'סיוון': 3,
  'תמוז': 4,
  'אב': 5, 'מנחם אב': 5, 'מנ"א': 5,
  'אלול': 6,
  'תשרי': 7,
  'חשון': 8, 'חשוון': 8, 'מרחשון': 8, 'מר חשון': 8,
  'כסלו': 9, 'כסליו': 9,
  'טבת': 10,
  'שבט': 11,
  'אדר': 12, "אדר א'": 12, 'אדר א': 12, 'אדר ראשון': 12,
  "אדר ב'": 13, 'אדר ב': 13, 'אדר שני': 13,
};

// Common memorial abbreviations
export const MEMORIAL_ABBREVIATIONS: Record<string, string> = {
  'פ"נ': 'פה נטמן / פה נקבר',
  'פ״נ': 'פה נטמן / פה נקבר',
  'הכ"מ': 'הכאן מונח',
  'ז"ל': 'זכרונו/ה לברכה',
  'ז״ל': 'זכרונו/ה לברכה',
  'זצ"ל': 'זכר צדיק לברכה',
  'זצוק"ל': 'זכר צדיק וקדוש לברכה',
  'ע"ה': 'עליו/ה השלום',
  'ע״ה': 'עליו/ה השלום',
  'נ"ע': 'נוחו/ה עדן',
  'נ״ע': 'נוחו/ה עדן',
  'הי"ד': 'השם יקום דמו',
  'ת.נ.צ.ב.ה': 'תהא נשמתו/ה צרורה בצרור החיים',
  'תנצב"ה': 'תהא נשמתו/ה צרורה בצרור החיים',
  'ב"ר': 'בן/בת רבי',
  'בן': 'בן',
  'בת': 'בת',
  'נפ\'': 'נפטר/ה',
  'נפטר': 'נפטר',
  'נפטרה': 'נפטרה',
};

/**
 * Convert Hebrew numerals (Gematria) to integer
 * Examples: ה'תשפ"ה → 5785, י"א → 11
 */
export function hebrewNumeralToInt(hebrewNum: string): number | null {
  if (!hebrewNum) return null;

  // Clean the string: remove quotes, geresh, gershayim, apostrophes
  const cleaned = hebrewNum
    .replace(/['"״׳"'`]/g, '')
    .replace(/\s/g, '')
    .trim();

  if (!cleaned) return null;

  let total = 0;
  let hasValidLetter = false;

  for (const char of cleaned) {
    const value = HEBREW_LETTER_VALUES[char];
    if (value !== undefined) {
      total += value;
      hasValidLetter = true;
    }
  }

  return hasValidLetter ? total : null;
}

/**
 * Parse a Hebrew year string to full year number
 * Examples: ה'תשפ"ה → 5785, תשע"ט → 5779
 */
export function parseHebrewYear(yearStr: string): number | null {
  const numericValue = hebrewNumeralToInt(yearStr);
  if (numericValue === null) return null;

  // If the value is less than 1000, it's likely missing the thousands
  // Most tombstones are from the 5000s (5th millennium)
  if (numericValue < 1000) {
    return 5000 + numericValue;
  }

  return numericValue;
}

/**
 * Parse a Hebrew day number
 * Examples: י"א → 11, כ"ג → 23, ה' → 5
 */
export function parseHebrewDay(dayStr: string): number | null {
  return hebrewNumeralToInt(dayStr);
}

/**
 * Parse Hebrew month name to month number (1-13)
 */
export function parseHebrewMonth(monthStr: string): number | null {
  if (!monthStr) return null;

  const cleaned = monthStr.trim();

  // Direct lookup
  if (HEBREW_MONTHS[cleaned] !== undefined) {
    return HEBREW_MONTHS[cleaned];
  }

  // Try case-insensitive partial match
  const lowerCleaned = cleaned.toLowerCase();
  for (const [name, num] of Object.entries(HEBREW_MONTHS)) {
    if (name.includes(lowerCleaned) || lowerCleaned.includes(name)) {
      return num;
    }
  }

  return null;
}

/**
 * Parse a complete Hebrew date string
 * Examples: "י"א סיון תשע"ט", "ה' בטבת תשפ"ו"
 */
export function parseHebrewDate(dateStr: string): {
  day: number | null;
  month: number | null;
  monthName: string | null;
  year: number | null;
} {
  if (!dateStr) {
    return { day: null, month: null, monthName: null, year: null };
  }

  // Split by spaces and analyze parts
  const parts = dateStr.split(/\s+/).filter(Boolean);

  let day: number | null = null;
  let monthNum: number | null = null;
  let monthName: string | null = null;
  let year: number | null = null;

  for (const part of parts) {
    // Skip common prefixes
    if (part === 'ב' || part === 'ל' || part === 'נפ\'') continue;

    // Try to parse as month
    const monthMatch = parseHebrewMonth(part);
    if (monthMatch !== null) {
      monthNum = monthMatch;
      monthName = part;
      continue;
    }

    // Try to parse as number
    const numValue = hebrewNumeralToInt(part);
    if (numValue !== null) {
      // Large numbers are years, small are days
      if (numValue > 31 || part.includes('ת') || part.includes('ש')) {
        year = numValue < 1000 ? 5000 + numValue : numValue;
      } else if (numValue >= 1 && numValue <= 30) {
        day = numValue;
      }
    }
  }

  return { day, month: monthNum, monthName, year };
}

/**
 * Extract Gregorian years from text
 * Examples: "1938 - 2019" → { birth: 1938, death: 2019 }
 */
export function extractGregorianYears(text: string): {
  birthYear: number | null;
  deathYear: number | null;
} {
  const yearPattern = /\b(19\d{2}|20\d{2})\b/g;
  const matches = text.match(yearPattern);

  if (!matches || matches.length === 0) {
    return { birthYear: null, deathYear: null };
  }

  const years = matches.map(Number).sort((a, b) => a - b);

  if (years.length === 1) {
    return { birthYear: null, deathYear: years[0] };
  }

  return {
    birthYear: years[0],
    deathYear: years[years.length - 1],
  };
}

/**
 * Check if text contains valid memorial abbreviations
 */
export function findAbbreviations(text: string): string[] {
  const found: string[] = [];

  for (const abbrev of Object.keys(MEMORIAL_ABBREVIATIONS)) {
    if (text.includes(abbrev)) {
      found.push(abbrev);
    }
  }

  return found;
}

/**
 * Validate abbreviation format
 */
export function isValidAbbreviation(text: string): boolean {
  return Object.keys(MEMORIAL_ABBREVIATIONS).includes(text);
}

/**
 * Get Hebrew month name from number
 */
export function getHebrewMonthName(monthNum: number): string | null {
  const monthNames = [
    null, 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול',
    'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב\'',
  ];
  return monthNames[monthNum] || null;
}
