import { useRef, useState, useCallback } from 'react';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

function isValidFileType(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type) || file.type.startsWith('image/');
}

export function PDFUploader({ onFileSelect, isProcessing }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    if (file && isValidFileType(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  }, []);

  const handleClick = () => {
    if (!isProcessing) {
      fileInputRef.current?.click();
    }
  };

  const isImage = selectedFile?.type.startsWith('image/');
  const uploadIcon = isImage ? '🖼️' : '📄';

  return (
    <div className="card">
      <div className="card-header">
        <h2>העלאת קובץ לבדיקה</h2>
      </div>
      <div className="card-body">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />

        <div
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="upload-icon">{uploadIcon}</div>
          {selectedFile ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                גרור קובץ לכאן או לחץ לבחירה
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                תומך ב-PDF ותמונות (JPG, PNG)
              </p>
            </>
          )}
        </div>

        {selectedFile && !isProcessing && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              בחר קובץ אחר
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
