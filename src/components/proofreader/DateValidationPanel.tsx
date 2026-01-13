import type { DateValidationResult } from '../../types/proofreader';

interface DateValidationPanelProps {
  validation: DateValidationResult;
  personName?: string;
}

export function DateValidationPanel({ validation, personName }: DateValidationPanelProps) {
  const { hebrewDate, gregorianDate, isConsistent, discrepancyExplanation } = validation;

  return (
    <div className={`date-panel ${isConsistent ? 'match' : 'mismatch'}`}>
      <div>
        <div className="date-label">תאריך עברי</div>
        <div className="date-value">
          {hebrewDate?.rawText || 'לא זוהה'}
        </div>
        {hebrewDate?.year && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            שנה: {hebrewDate.year}
          </div>
        )}
      </div>

      <div>
        <div className="date-label">תאריך לועזי</div>
        <div className="date-value">
          {gregorianDate?.rawText || 'לא זוהה'}
        </div>
        {gregorianDate?.year && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            שנה: {gregorianDate.year}
          </div>
        )}
      </div>

      {personName && (
        <div style={{ gridColumn: '1 / -1', fontSize: '0.875rem', fontWeight: 600 }}>
          {personName}
        </div>
      )}

      {!isConsistent && discrepancyExplanation && (
        <div style={{
          gridColumn: '1 / -1',
          padding: '0.75rem',
          background: 'var(--error-bg)',
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          color: 'var(--error-color)',
        }}>
          ⚠️ {discrepancyExplanation}
        </div>
      )}

      {isConsistent && (
        <div style={{
          gridColumn: '1 / -1',
          textAlign: 'center',
          color: 'var(--success-color)',
          fontSize: '0.875rem',
        }}>
          ✓ התאריכים תואמים
        </div>
      )}
    </div>
  );
}
