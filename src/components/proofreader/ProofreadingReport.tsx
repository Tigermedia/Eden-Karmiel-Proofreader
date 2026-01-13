import type { ProofreadingReport as Report } from '../../types/proofreader';
import { ErrorItem } from './ErrorItem';
import { DateValidationPanel } from './DateValidationPanel';

interface ProofreadingReportProps {
  report: Report;
}

export function ProofreadingReport({ report }: ProofreadingReportProps) {
  const { extractedText, issues, dateValidation, summary } = report;

  return (
    <div className="card">
      <div className="card-header">
        <h2>דוח הגהה: {report.fileName}</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {new Date(report.timestamp).toLocaleString('he-IL')}
        </p>
      </div>

      <div className="card-body">
        {/* Summary Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--text-primary)' }}>
              {summary.totalIssues}
            </div>
            <div className="stat-label">סה"כ ממצאים</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--error-color)' }}>
              {summary.errors}
            </div>
            <div className="stat-label">שגיאות</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--warning-color)' }}>
              {summary.warnings}
            </div>
            <div className="stat-label">אזהרות</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--suggestion-color)' }}>
              {summary.suggestions}
            </div>
            <div className="stat-label">הצעות</div>
          </div>
        </div>

        {/* Date Validation Section */}
        {dateValidation && dateValidation.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>בדיקת תאריכים</h3>
            {dateValidation.map((validation, index) => (
              <DateValidationPanel
                key={index}
                validation={validation}
                personName={extractedText?.memorials[index]?.name}
              />
            ))}
          </section>
        )}

        {/* Issues Section */}
        {issues.length > 0 ? (
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>ממצאים ({issues.length})</h3>
            {issues.map((issue) => (
              <ErrorItem key={issue.id} issue={issue} />
            ))}
          </section>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            background: 'var(--success-bg)',
            borderRadius: 'var(--radius)',
            marginBottom: '2rem',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
            <p style={{ color: 'var(--success-color)', fontWeight: 600 }}>
              לא נמצאו שגיאות!
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              המסמך נבדק ונמצא תקין
            </p>
          </div>
        )}

        {/* Extracted Text Preview */}
        {extractedText && (
          <section>
            <h3 style={{ marginBottom: '1rem' }}>טקסט שחולץ</h3>

            {extractedText.familyName && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>שם משפחה:</strong> {extractedText.familyName}
              </div>
            )}

            {extractedText.memorials.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>הנצחות ({extractedText.memorials.length}):</strong>
                <ul style={{ marginTop: '0.5rem', paddingRight: '1.5rem' }}>
                  {extractedText.memorials.map((memorial, index) => (
                    <li key={index} style={{ marginBottom: '0.5rem' }}>
                      <strong>{memorial.name}</strong>
                      {memorial.parentNames && ` - ${memorial.parentNames}`}
                      {memorial.gregorianYears && ` (${memorial.gregorianYears})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                הצג טקסט מלא
              </summary>
              <div className="text-preview">
                {extractedText.rawText}
              </div>
            </details>
          </section>
        )}
      </div>
    </div>
  );
}
