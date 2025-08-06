import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Upload, FileText, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [scale, setScale] = useState(2);
  const [rotation, setRotation] = useState(0);
  const [customZoomInput, setCustomZoomInput] = useState('200');
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (!pdfData) return;
    const loadPdf = async () => {
      try {
        setLoading(true);
        setLoadingProgress(0);
        setError(null);
        
        const loadingTask = getDocument({ data: pdfData });
        loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
          if (progress.total) {
            setLoadingProgress((progress.loaded / progress.total) * 100);
          }
        };
        
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoadingProgress(100);
      } catch (e) {
        setError('Failed to load PDF. Please make sure it\'s a valid PDF file.');
        setPdfDoc(null);
        setNumPages(0);
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, [pdfData]);

  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;
    (async () => {
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const canvas = canvasRefs.current[i - 1];
        if (!canvas) continue;
        const context = canvas.getContext('2d');
        if (!context) continue;

        const devicePixelRatio = window.devicePixelRatio || 1;
        
        const baseScale = Math.max(scale, 1.5);
        const outputScale = devicePixelRatio * baseScale;
        
        const viewport = page.getViewport({ scale: outputScale });
        
        canvas.style.width = `${(viewport.width / devicePixelRatio) * (scale / baseScale)}px`;
        canvas.style.height = `${(viewport.height / devicePixelRatio) * (scale / baseScale)}px`;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        await page.render({ 
          canvasContext: context, 
          canvas, 
          viewport: viewport
        }).promise;
      }
    })();
  }, [pdfDoc, numPages, scale]);

  useEffect(() => {
    setCustomZoomInput(Math.round(scale * 100).toString());
  }, [scale]);

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

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.5, 4);
    setScale(newScale);
    setCustomZoomInput(Math.round(newScale * 100).toString());
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.5, 0.75);
    setScale(newScale);
    setCustomZoomInput(Math.round(newScale * 100).toString());
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleCustomZoomChange = (value: string) => {
    setCustomZoomInput(value);
  };

  const handleCustomZoomSubmit = () => {
    const numValue = parseInt(customZoomInput, 10);
    if (!isNaN(numValue) && numValue >= 75 && numValue <= 400) {
      const newScale = numValue / 100;
      setScale(newScale);
      setCustomZoomInput(Math.round(newScale * 100).toString());
    } else {
      setCustomZoomInput(Math.round(scale * 100).toString());
    }
  };

  const handleCustomZoomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCustomZoomSubmit();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setCustomZoomInput(Math.round(scale * 100).toString());
      e.currentTarget.blur();
    }
  };

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1; // 10% increments
      const newScale = Math.max(0.75, Math.min(4, scale + delta));
      setScale(newScale);
      setCustomZoomInput(Math.round(newScale * 100).toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '=':
        case '+':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          {
            const newScale = 1; // Reset to 100%
            setScale(newScale);
            setCustomZoomInput(Math.round(newScale * 100).toString());
          }
          break;
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls Header */}
      {pdfData && !loading && !error && (
        <div className="border-b bg-card px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">
                {numPages} page{numPages !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                • Enter custom % • Ctrl+scroll (10%) • Ctrl+0 to reset
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.75}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center">
                <input
                  type="text"
                  value={customZoomInput}
                  onChange={(e) => handleCustomZoomChange(e.target.value)}
                  onBlur={handleCustomZoomSubmit}
                  onKeyDown={handleCustomZoomKeyDown}
                  className="w-16 px-2 py-1 text-sm text-center border rounded bg-background text-foreground"
                  placeholder="100"
                />
                <span className="text-sm ml-1">%</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 4}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {!pdfData && (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload PDF Document
              </CardTitle>
              <CardDescription>
                Select a PDF file to view in high-resolution with crisp rendering optimized for your display. 
                Use Ctrl+scroll (10% steps), Ctrl+/- keys, or enter custom zoom percentage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange} 
                className="w-full" 
              />
            </CardContent>
          </Card>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Loading PDF...</span>
                  <span>{Math.round(loadingProgress)}%</span>
                </div>
                <Progress value={loadingProgress} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {pdfData && !loading && !error && (
        <div className="flex-1 overflow-hidden"
             onWheel={handleWheelZoom}
             onKeyDown={handleKeyDown}
             tabIndex={0}>
          <ScrollArea className="h-full w-full">
            <div className="p-6 min-w-max w-full flex flex-col gap-8 items-center">
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div 
                    className="shadow-lg rounded-lg overflow-hidden border bg-white flex-shrink-0"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    <canvas 
                      ref={el => { canvasRefs.current[i] = el; }} 
                      className="block"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Page {i + 1} of {numPages}
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
