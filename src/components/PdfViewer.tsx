import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();

const PdfViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfData) return;
    const loadPdf = async () => {
      try {
        const loadingTask = getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNum(1);
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
    if (!pdfDoc) return;
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, canvas, viewport }).promise;
        setError(null);
      } catch (e) {
        setError('Failed to render PDF page.');
      }
    };
    renderPage();
  }, [pdfDoc, pageNum]);

  const goToPrevPage = () => setPageNum((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNum((prev) => Math.min(prev + 1, numPages));

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
    <div className="pdf-viewer">
      <div style={{ marginBottom: 16 }}>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {pdfData && (
        <div className="controls">
          <button onClick={goToPrevPage} disabled={pageNum <= 1}>Previous</button>
          <span>Page {pageNum} of {numPages}</span>
          <button onClick={goToNextPage} disabled={pageNum >= numPages}>Next</button>
        </div>
      )}
      <canvas ref={canvasRef} />
    </div>
  );
};

export default PdfViewer;
