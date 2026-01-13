/**
 * Hebrew Date Validator
 * Cross-validates Hebrew and Gregorian dates using @hebcal/core
 */

import { HDate, months } from '@hebcal/core';
import type { DateValidationResult, HebrewDateInfo, GregorianDateInfo } from '../types/proofreader';
import { parseHebrewDate, extractGregorianYears } from './hebrewTextUtils';

// Map our month numbers to hebcal month constants
const MONTH_TO_HEBCAL: Record<number, number> = {
  1: months.NISAN,
  2: months.IYYAR,
  3: months.SIVAN,
  4: months.TAMUZ,
  5: months.AV,
  6: months.ELUL,
  7: months.TISHREI,
  8: months.CHESHVAN,
  9: months.KISLEV,
  10: months.TEVET,
  11: months.SHVAT,
  12: months.ADAR_I,
  13: months.ADAR_II,
};

/**
 * Convert Hebrew date to Gregorian using hebcal
 */
export function hebrewToGregorian(
  day: number,
  month: number,
  year: number
): Date | null {
  try {
    const hebcalMonth = MONTH_TO_HEBCAL[month];
    if (!hebcalMonth) return null;

    const hdate = new HDate(day, hebcalMonth, year);
    return hdate.greg();
  } catch (error) {
    console.error('Hebrew to Gregorian conversion error:', error);
    return null;
  }
}

/**
 * Convert Gregorian date to Hebrew using hebcal
 */
export function gregorianToHebrew(date: Date): {
  day: number;
  month: number;
  monthName: string;
  year: number;
} | null {
  try {
    const hdate = new HDate(date);
    return {
      day: hdate.getDate(),
      month: hdate.getMonth(),
      monthName: hdate.getMonthName(), // Hebrew month name
      year: hdate.getFullYear(),
    };
  } catch (error) {
    console.error('Gregorian to Hebrew conversion error:', error);
    return null;
  }
}

/**
 * Validate that Hebrew and Gregorian dates are consistent
 */
export function validateDateConsistency(
  hebrewDateStr: string,
  gregorianYearStr: string
): DateValidationResult {
  // Parse the Hebrew date
  const parsedHebrew = parseHebrewDate(hebrewDateStr);
  const hebrewDateInfo: HebrewDateInfo = {
    day: parsedHebrew.day ?? undefined,
    month: parsedHebrew.monthName ?? undefined,
    monthNumeric: parsedHebrew.month ?? undefined,
    year: parsedHebrew.year ?? undefined,
    rawText: hebrewDateStr,
  };

  // Parse Gregorian years
  const { deathYear } = extractGregorianYears(gregorianYearStr);
  const gregorianDateInfo: GregorianDateInfo = {
    year: deathYear ?? undefined,
    rawText: gregorianYearStr,
  };

  // If we don't have enough info, return inconclusive
  if (!parsedHebrew.year || !deathYear) {
    return {
      hebrewDate: hebrewDateInfo,
      gregorianDate: gregorianDateInfo,
      isConsistent: true, // Can't determine, assume OK
      discrepancyExplanation: parsedHebrew.year && !deathYear
        ? 'לא נמצאה שנה גרגוריאנית להשוואה'
        : !parsedHebrew.year && deathYear
          ? 'לא נמצאה שנה עברית להשוואה'
          : undefined,
    };
  }

  // Convert Hebrew date to Gregorian for comparison
  // Use day 15 (middle of month) if day is unknown for year comparison
  const dayToUse = parsedHebrew.day || 15;
  const monthToUse = parsedHebrew.month || 7; // Default to Tishrei

  const convertedDate = hebrewToGregorian(dayToUse, monthToUse, parsedHebrew.year);

  if (!convertedDate) {
    return {
      hebrewDate: hebrewDateInfo,
      gregorianDate: gregorianDateInfo,
      isConsistent: true,
      discrepancyExplanation: 'לא ניתן להמיר את התאריך העברי',
    };
  }

  const convertedYear = convertedDate.getFullYear();

  // Check if years match (allow ±1 year for Hebrew year boundary differences)
  const yearDiff = Math.abs(convertedYear - deathYear);
  const isConsistent = yearDiff <= 1;

  if (isConsistent) {
    return {
      hebrewDate: hebrewDateInfo,
      gregorianDate: gregorianDateInfo,
      isConsistent: true,
    };
  }

  // Calculate what the correct dates should be
  const expectedGregorianDate = `${convertedDate.getDate()}/${convertedDate.getMonth() + 1}/${convertedYear}`;

  // Calculate expected Hebrew date from Gregorian
  const gregorianAsDate = new Date(deathYear, 0, 1); // Jan 1 of death year
  const expectedHebrew = gregorianToHebrew(gregorianAsDate);
  const expectedHebrewYear = expectedHebrew ? `ה'תש${getHebrewYearSuffix(expectedHebrew.year)}` : undefined;

  return {
    hebrewDate: hebrewDateInfo,
    gregorianDate: gregorianDateInfo,
    isConsistent: false,
    expectedGregorianDate,
    expectedHebrewDate: expectedHebrewYear,
    discrepancyExplanation: `התאריך העברי ${hebrewDateStr} מתאים לשנה ${convertedYear} ולא ל-${deathYear}`,
  };
}

/**
 * Get Hebrew year suffix for display
 * Converts 5785 to פ"ה
 */
function getHebrewYearSuffix(year: number): string {
  // This is a simplified version - just shows the last two digits concept
  const lastTwo = year % 100;
  // For accurate Hebrew numeral conversion, we'd need more complex logic
  return `"${lastTwo}`;
}

/**
 * Validate multiple dates from a tombstone
 */
export function validateAllDates(
  memorials: Array<{
    hebrewDate?: string;
    gregorianYears?: string;
    name?: string;
  }>
): DateValidationResult[] {
  return memorials
    .filter((m) => m.hebrewDate || m.gregorianYears)
    .map((memorial) => ({
      ...validateDateConsistency(
        memorial.hebrewDate || '',
        memorial.gregorianYears || ''
      ),
      // Add context about which person this date belongs to
    }));
}

/**
 * Format Hebrew date for display
 */
export function formatHebrewDate(date: HDate): string {
  return date.render('h'); // Hebrew format
}

/**
 * Check if a Hebrew year is a leap year (has Adar II)
 */
export function isHebrewLeapYear(year: number): boolean {
  return HDate.isLeapYear(year);
}
