import type { ProofreadingIssue } from '../../types/proofreader';
import { CATEGORY_LABELS, SEVERITY_LABELS } from '../../types/proofreader';

interface ErrorItemProps {
  issue: ProofreadingIssue;
}

export function ErrorItem({ issue }: ErrorItemProps) {
  const severityClass = issue.severity;

  return (
    <div className={`issue-card ${severityClass}`}>
      <div className="issue-header">
        <span className="issue-category">
          {CATEGORY_LABELS[issue.category]}
        </span>
        <span className={`badge badge-${severityClass}`}>
          {SEVERITY_LABELS[issue.severity]}
        </span>
      </div>

      <div className="issue-text">
        {issue.originalText && (
          <span className="issue-original">{issue.originalText}</span>
        )}
        {issue.originalText && issue.suggestedFix && ' ← '}
        {issue.suggestedFix && (
          <span className="issue-fix">{issue.suggestedFix}</span>
        )}
      </div>

      <p className="issue-explanation">{issue.explanation}</p>

      {issue.location?.context && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          הקשר: {issue.location.context}
        </p>
      )}
    </div>
  );
}
