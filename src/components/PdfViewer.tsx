import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

type PDFPageViewport = {
  width: number;
  height: number;
};

type PDFDocumentProxy = {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getViewport: (opts: { scale: number }) => PDFPageViewport;
    render: (params: { canvasContext: CanvasRenderingContext2D; canvas: HTMLCanvasElement; viewport: PDFPageViewport }) => { promise: Promise<void> };
  }>;
};

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();


const PdfViewer: React.FC = () => {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (!pdfData) return;
    const loadPdf = async () => {
      try {
        const loadingTask = getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setError(null);
      } catch (e) {
        setError('Failed to load PDF.');
        setPdfDoc(null);
        setNumPages(0);
      }
    };
    loadPdf();
  }, [pdfData]);

  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;
    (async () => {
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRefs.current[i - 1];
        if (!canvas) continue;
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, canvas, viewport }).promise;
      }
    })();
  }, [pdfDoc, numPages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPdfData(reader.result as ArrayBuffer);
      };
      reader.onerror = () => {
        setError('Failed to read file.');
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="pdf-viewer w-full flex flex-col items-center">
      <div className="mb-4 w-full max-w-md">
        <Input type="file" accept="application/pdf" onChange={handleFileChange} className="w-full" />
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {pdfData && (
        <ScrollArea className="w-full max-w-3xl h-[80vh] border rounded-lg p-4 bg-background">
          <div className="flex flex-col gap-8">
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <canvas ref={el => { canvasRefs.current[i] = el; }} className="shadow-lg rounded" />
                <div className="text-xs text-muted-foreground">Page {i + 1}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default PdfViewer;
