/**
 * PDF to Image Converter
 * Converts PDF pages to images for Claude Vision processing
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Claude Vision API max dimension is 8000px, use 4000 to be safe
const MAX_DIMENSION = 4000;

export interface PDFConversionResult {
  success: boolean;
  images?: Blob[];
  pageCount?: number;
  error?: string;
}

/**
 * Resize canvas if it exceeds max dimensions
 */
function resizeCanvasIfNeeded(
  sourceCanvas: HTMLCanvasElement,
  maxDimension: number
): HTMLCanvasElement {
  const { width, height } = sourceCanvas;

  // Check if resizing is needed
  if (width <= maxDimension && height <= maxDimension) {
    return sourceCanvas;
  }

  // Calculate new dimensions while maintaining aspect ratio
  const scale = Math.min(maxDimension / width, maxDimension / height);
  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);

  // Create new canvas with resized dimensions
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = newWidth;
  resizedCanvas.height = newHeight;

  const ctx = resizedCanvas.getContext('2d');
  if (!ctx) {
    return sourceCanvas;
  }

  // Use better image smoothing for downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);

  console.log(`Resized image from ${width}x${height} to ${newWidth}x${newHeight}`);
  return resizedCanvas;
}

/**
 * Convert a PDF file to an array of image Blobs (one per page)
 * @param pdfFile - The PDF file to convert
 * @param scale - Resolution scale (2.0 = 2x resolution, good for OCR)
 */
export async function pdfToImages(
  pdfFile: File,
  scale = 2.0
): Promise<PDFConversionResult> {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: Blob[] = [];

    console.log(`PDF loaded: ${pdf.numPages} page(s) detected`);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      // Resize if needed for Claude API limits
      const finalCanvas = resizeCanvasIfNeeded(canvas, MAX_DIMENSION);

      // Convert canvas to Blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        finalCanvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to convert canvas to blob'));
          },
          'image/png',
          1.0
        );
      });

      images.push(blob);
    }

    return {
      success: true,
      images,
      pageCount: pdf.numPages,
    };
  } catch (error) {
    console.error('PDF conversion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown PDF conversion error',
    };
  }
}

/**
 * Convert a Blob to base64 string (for API submission)
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Create an object URL for a Blob (for preview display)
 */
export function createPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke an object URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
