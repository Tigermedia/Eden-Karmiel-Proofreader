import { useState, useCallback } from 'react';
import type { ProofreadingReport, ProcessingStatus, DateValidationResult, ProofreadingIssue, MemorialEntry } from '../../types/proofreader';
import { pdfToImages, createPreviewUrl, revokePreviewUrl } from '../../utils/pdfToImage';
import { proofreadImageWithGemini, isGeminiConfigured } from '../../services/gemini';
import { validateDateConsistency } from '../../utils/hebrewDateValidator';
import { PDFUploader } from './PDFUploader';
import { ProofreadingReport as ReportDisplay } from './ProofreadingReport';

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function PDFProofreader() {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [report, setReport] = useState<ProofreadingReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setReport(null);

    // Clean up previous previews
    previewUrls.forEach(url => revokePreviewUrl(url));
    setPreviewUrls([]);

    // Check API configuration
    if (!isGeminiConfigured()) {
      setError('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in .env.local');
      return;
    }

    try {
      let images: Blob[];
      let totalPages: number;

      // Step 1: Get images (either from PDF conversion or direct image file)
      if (isImageFile(file)) {
        // Direct image file - use as-is
        setStatus('converting');
        setStatusMessage('מכין תמונה לניתוח...');
        images = [file];
        totalPages = 1;
        console.log('Image file loaded directly');
      } else {
        // PDF file - convert to images
        setStatus('converting');
        setStatusMessage('ממיר PDF לתמונות...');

        const conversionResult = await pdfToImages(file);
        if (!conversionResult.success || !conversionResult.images?.length) {
          throw new Error(conversionResult.error || 'Failed to convert PDF');
        }
        images = conversionResult.images;
        totalPages = images.length;
        console.log(`PDF conversion complete: ${totalPages} page(s)`);
      }

      // Create preview URLs for all pages
      const previews = images.map(img => createPreviewUrl(img));
      setPreviewUrls(previews);

      // Step 2: Analyze each page with Gemini
      setStatus('analyzing');

      const allTexts: string[] = [];
      const allIssues: ProofreadingIssue[] = [];
      const allMemorials: MemorialEntry[] = [];

      for (let i = 0; i < totalPages; i++) {
        setStatusMessage(`מנתח טקסט עברי... (עמוד ${i + 1} מתוך ${totalPages})`);

        const proofreadResult = await proofreadImageWithGemini(images[i]);
        if (!proofreadResult.success) {
          throw new Error(proofreadResult.error || `Failed to analyze page ${i + 1}`);
        }

        if (proofreadResult.extractedText?.rawText) {
          allTexts.push(`── עמוד ${i + 1} ──\n${proofreadResult.extractedText.rawText}`);
        }

        if (proofreadResult.issues) {
          allIssues.push(...proofreadResult.issues);
        }

        if (proofreadResult.extractedText?.memorials) {
          allMemorials.push(...proofreadResult.extractedText.memorials);
        }
      }

      // Step 3: Validate dates
      setStatus('validating');
      setStatusMessage('מאמת תאריכים...');

      const dateValidations: DateValidationResult[] = [];
      for (const memorial of allMemorials) {
        if (memorial.hebrewDeathDate || memorial.gregorianYears) {
          const validation = validateDateConsistency(
            memorial.hebrewDeathDate || '',
            memorial.gregorianYears || ''
          );
          dateValidations.push(validation);
        }
      }

      // Step 4: Create report
      const newReport: ProofreadingReport = {
        id: `report-${Date.now()}`,
        fileName: file.name,
        timestamp: new Date(),
        status: 'completed',
        extractedText: {
          rawText: allTexts.join('\n\n'),
          memorials: allMemorials,
          headerFormulas: [],
          footerFormulas: [],
        },
        issues: allIssues,
        dateValidation: dateValidations,
        summary: {
          totalIssues: allIssues.length,
          errors: allIssues.filter(i => i.severity === 'error').length,
          warnings: allIssues.filter(i => i.severity === 'warning').length,
          suggestions: allIssues.filter(i => i.severity === 'suggestion').length,
        },
      };

      setReport(newReport);
      setStatus('completed');
      setStatusMessage('הבדיקה הושלמה!');

    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus('error');
      setStatusMessage('שגיאה בעיבוד');
    }
  }, [previewUrls]);

  const handleReset = () => {
    previewUrls.forEach(url => revokePreviewUrl(url));
    setPreviewUrls([]);
    setStatus('idle');
    setStatusMessage('');
    setReport(null);
    setError(null);
  };

  const isProcessing = status === 'converting' || status === 'analyzing' || status === 'validating';

  // Show split layout when we have a report or are processing
  const showSplitLayout = previewUrls.length > 0 && (report || isProcessing);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-card">
            <div className="spinner" />
            <h3>{statusMessage}</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              אנא המתן...
            </p>
          </div>
        </div>
      )}

      {/* Initial State - Upload Section */}
      {!showSplitLayout && (
        <>
          <PDFUploader onFileSelect={processFile} isProcessing={isProcessing} />

          {/* Error Display */}
          {error && (
            <div className="card" style={{ borderColor: 'var(--error-color)' }}>
              <div className="card-body" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
                <h3 style={{ color: 'var(--error-color)', marginBottom: '0.5rem' }}>שגיאה</h3>
                <p style={{ marginBottom: '1rem' }}>{error}</p>
                <button className="btn btn-primary" onClick={handleReset}>
                  נסה שוב
                </button>
              </div>
            </div>
          )}

          {/* Initial State - Tips */}
          {status === 'idle' && !error && (
            <div className="card">
              <div className="card-body">
                <h3 style={{ marginBottom: '1rem' }}>מה הכלי בודק?</h3>
                <ul style={{ paddingRight: '1.5rem', lineHeight: 2 }}>
                  <li><strong>שגיאות כתיב</strong> - איות לא נכון של מילים עבריות</li>
                  <li><strong>שגיאות דקדוק</strong> - התאמת מין, סמיכות</li>
                  <li><strong>קיצורים</strong> - פ"נ, ז"ל, ת.נ.צ.ב.ה</li>
                  <li><strong>תאריכים</strong> - התאמה בין תאריך עברי ללועזי</li>
                  <li><strong>ציטוטים</strong> - דיוק פסוקים מהתנ"ך</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* Split Layout - PDF on Left (visually), Report on Right (visually) */}
      {/* In RTL, we swap the order: Report first, then PDF */}
      {showSplitLayout && (
        <>
          <div className="split-layout">
            {/* Report (appears on right in RTL) */}
            <div className="report-panel">
              {report && <ReportDisplay report={report} />}
              {error && (
                <div className="card" style={{ borderColor: 'var(--error-color)' }}>
                  <div className="card-body" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
                    <h3 style={{ color: 'var(--error-color)', marginBottom: '0.5rem' }}>שגיאה</h3>
                    <p>{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* PDF Preview (appears on left in RTL) */}
            <div className="pdf-preview-panel">
              <div className="card" style={{ height: '100%' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>תצוגת המסמך ({previewUrls.length} {previewUrls.length === 1 ? 'עמוד' : 'עמודים'})</h3>
                  <button className="btn btn-secondary" onClick={handleReset} style={{ padding: '0.5rem 1rem' }}>
                    בדוק קובץ אחר
                  </button>
                </div>
                <div className="card-body" style={{ padding: '1rem', overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                  {previewUrls.map((url, index) => (
                    <div key={index} style={{ marginBottom: index < previewUrls.length - 1 ? '1rem' : 0 }}>
                      {previewUrls.length > 1 && (
                        <div style={{
                          textAlign: 'center',
                          padding: '0.5rem',
                          background: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius)',
                          marginBottom: '0.5rem',
                          fontWeight: 600
                        }}>
                          עמוד {index + 1}
                        </div>
                      )}
                      <img
                        src={url}
                        alt={`PDF Page ${index + 1}`}
                        style={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: 'var(--radius)',
                          boxShadow: 'var(--shadow-md)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
