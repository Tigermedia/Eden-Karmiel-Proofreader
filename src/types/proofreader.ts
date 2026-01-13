/**
 * Types for Hebrew Tombstone PDF Proofreader
 */

// Severity levels for issues found
export type IssueSeverity = 'error' | 'warning' | 'suggestion';

// Categories of issues the proofreader can detect
export type IssueCategory =
  | 'spelling'           // Hebrew spelling errors
  | 'grammar'            // Gender agreement, construct state
  | 'abbreviation'       // Incorrect abbreviation format
  | 'date_mismatch'      // Hebrew-Gregorian date inconsistency
  | 'quote_accuracy'     // Biblical/literary quote errors
  | 'formatting'         // Layout/spacing issues
  | 'missing_element';   // Missing required elements (פ"נ, ת.נ.צ.ב.ה)

// Individual issue found during proofreading
export interface ProofreadingIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  originalText: string;
  suggestedFix?: string;
  explanation: string;
  location?: {
    section?: string;
    context?: string;
  };
}

// Hebrew date as parsed from tombstone
export interface HebrewDateInfo {
  day?: number;
  month?: string;
  monthNumeric?: number;
  year?: number;
  rawText: string;
}

// Gregorian date as parsed from tombstone
export interface GregorianDateInfo {
  day?: number;
  month?: number;
  year?: number;
  rawText: string;
}

// Date validation result
export interface DateValidationResult {
  hebrewDate: HebrewDateInfo | null;
  gregorianDate: GregorianDateInfo | null;
  isConsistent: boolean;
  expectedHebrewDate?: string;
  expectedGregorianDate?: string;
  discrepancyExplanation?: string;
}

// Memorial entry extracted from tombstone
export interface MemorialEntry {
  name?: string;
  relationship?: string;
  parentNames?: string;
  hebrewDeathDate?: string;
  gregorianYears?: string;
  quote?: string;
}

// Extracted text structure from tombstone
export interface ExtractedTombstoneText {
  rawText: string;
  familyName?: string;
  memorials: MemorialEntry[];
  headerFormulas: string[];
  footerFormulas: string[];
}

// Complete proofreading report
export interface ProofreadingReport {
  id: string;
  fileName: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedText: ExtractedTombstoneText | null;
  issues: ProofreadingIssue[];
  dateValidation: DateValidationResult[];
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    suggestions: number;
  };
  processingError?: string;
}

// Processing status for UI
export type ProcessingStatus = 'idle' | 'converting' | 'analyzing' | 'validating' | 'completed' | 'error';

// Hebrew category labels for UI
export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  spelling: 'שגיאת כתיב',
  grammar: 'שגיאת דקדוק',
  abbreviation: 'קיצור שגוי',
  date_mismatch: 'אי-התאמת תאריכים',
  quote_accuracy: 'ציטוט לא מדויק',
  formatting: 'עיצוב',
  missing_element: 'רכיב חסר',
} as const;

// Hebrew severity labels for UI
export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  error: 'שגיאה',
  warning: 'אזהרה',
  suggestion: 'הצעה',
} as const;
