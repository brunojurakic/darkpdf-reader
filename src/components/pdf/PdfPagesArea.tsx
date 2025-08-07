import React from 'react';
import PdfTextLayer from './PdfTextLayer';

interface PdfPagesAreaProps {
  numPages: number;
  pageDimensions: Map<number, { width: number; height: number }>;
  visiblePages: Set<number>;
  rotation: number;
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  isDarkMode: boolean;
  pdfDoc: unknown;
  scale: number;
}

const PdfPagesArea: React.FC<PdfPagesAreaProps> = ({
  numPages,
  pageDimensions,
  visiblePages,
  rotation,
  canvasRefs,
  pageRefs,
  isDarkMode,
  pdfDoc,
  scale,
}) => {
  const [pageObjects, setPageObjects] = React.useState<Map<number, unknown>>(new Map());
  const [viewports, setViewports] = React.useState<Map<number, unknown>>(new Map());
  const [renderingPages, setRenderingPages] = React.useState<Set<number>>(new Set());
  const [renderTasks, setRenderTasks] = React.useState<Map<number, { cancel: () => void }>>(new Map());
  
  const renderingPagesRef = React.useRef<Set<number>>(new Set());
  const renderTasksRef = React.useRef<Map<number, { cancel: () => void }>>(new Map());
  
  React.useEffect(() => {
    renderingPagesRef.current = renderingPages;
  }, [renderingPages]);
  
  React.useEffect(() => {
    renderTasksRef.current = renderTasks;
  }, [renderTasks]);

  const renderPageToCanvas = React.useCallback(async (pageNum: number) => {
    if (!pdfDoc || renderingPagesRef.current.has(pageNum)) return;

    const canvas = canvasRefs.current[pageNum - 1];
    const page = pageObjects.get(pageNum);
    
    if (!canvas || !page) return;

    const existingTask = renderTasksRef.current.get(pageNum);
    if (existingTask) {
      existingTask.cancel();
      setRenderTasks(prev => {
        const newTasks = new Map(prev);
        newTasks.delete(pageNum);
        return newTasks;
      });
    }

    setRenderingPages(prev => new Set(prev).add(pageNum));

    try {
      const context = canvas.getContext('2d');
      if (!context) {
        console.error(`No 2D context for canvas ${pageNum}`);
        return;
      }

      const pageObj = page as { 
        getViewport: (opts: { scale: number; rotation?: number }) => { width: number; height: number };
        render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void>; cancel: () => void };
      };
      
      const devicePixelRatio = window.devicePixelRatio || 1;
      const outputScale = devicePixelRatio * scale;
      const viewport = pageObj.getViewport({ scale: outputScale, rotation });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / devicePixelRatio}px`;
      canvas.style.height = `${viewport.height / devicePixelRatio}px`;

      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderTask = pageObj.render({
        canvasContext: context,
        viewport: viewport
      });

      setRenderTasks(prev => new Map(prev).set(pageNum, renderTask));

      await renderTask.promise;

      setRenderTasks(prev => {
        const newTasks = new Map(prev);
        newTasks.delete(pageNum);
        return newTasks;
      });

    } catch (error) {
      if ((error as Error).name !== 'RenderingCancelledException' && (error as Error).name !== 'AbortError') {
        console.error(`Error rendering page ${pageNum}:`, error);
      }
    } finally {
      setRenderingPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(pageNum);
        return newSet;
      });
    }
  }, [pdfDoc, pageObjects, scale, rotation, canvasRefs]);

  React.useEffect(() => {
    const renderTimeout = setTimeout(() => {
      for (const pageNum of visiblePages) {
        if (pageObjects.has(pageNum) && !renderingPagesRef.current.has(pageNum)) {
          renderPageToCanvas(pageNum);
        }
      }
    }, 100);

    return () => clearTimeout(renderTimeout);
  }, [visiblePages, pageObjects, renderPageToCanvas]);

  React.useEffect(() => {
    return () => {
      renderTasks.forEach(task => {
        task.cancel();
      });
    };
  }, [renderTasks]);

  React.useEffect(() => {
    if (!pdfDoc) return;

    const loadPages = async () => {
      setPageObjects(prevPageObjects => {
        const newPageObjects = new Map(prevPageObjects);
        
        for (const pageNum of visiblePages) {
          if (!newPageObjects.has(pageNum)) {
            (async () => {
              try {
                const pdfDocObj = pdfDoc as { getPage(pageNumber: number): Promise<unknown> };
                const page = await pdfDocObj.getPage(pageNum);
                setPageObjects(prev => new Map(prev).set(pageNum, page));
              } catch (error) {
                console.error(`Error loading page ${pageNum}:`, error);
              }
            })();
          }
        }
        
        return newPageObjects;
      });
    };

    loadPages();
  }, [pdfDoc, visiblePages]);

  React.useEffect(() => {
    if (!pdfDoc) return;

    setViewports(() => {
      const newViewports = new Map();
      
      for (const [pageNum, page] of pageObjects) {
        try {
          const pageObj = page as { getViewport(options: { scale: number }): unknown };
          const viewport = pageObj.getViewport({ scale: scale });
          newViewports.set(pageNum, viewport);
        } catch (error) {
          console.error(`Error creating viewport for page ${pageNum}:`, error);
        }
      }
      
      return newViewports;
    });
  }, [pageObjects, scale]);

  return (
    <div className="p-6 min-w-max w-full flex flex-col gap-4 items-center">
      {Array.from({ length: numPages }, (_, i) => {
        const pageNum = i + 1;
        const dimensions = pageDimensions.get(pageNum);
        const estimatedHeight = dimensions?.height || 600;
        const estimatedWidth = dimensions?.width || 400;
        const page = pageObjects.get(pageNum);
        const viewport = viewports.get(pageNum);
        const isPageVisible = visiblePages.has(pageNum);

        return (
          <div
            key={i}
            ref={el => { pageRefs.current[i] = el; }}
            className="flex flex-col items-center relative"
            style={{ minHeight: `${estimatedHeight + 50}px` }}
          >
            <div
              className={`shadow-lg rounded-lg overflow-hidden border flex-shrink-0 relative ${
                isDarkMode ? 'bg-black' : 'bg-white'
              }`}
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <canvas
                ref={el => { canvasRefs.current[i] = el; }}
                className="block"
                style={{
                  minWidth: `${estimatedWidth}px`,
                  minHeight: `${estimatedHeight}px`,
                  backgroundColor: isDarkMode 
                    ? (visiblePages.has(pageNum) ? '#1a1a1a' : '#0f0f0f')
                    : (visiblePages.has(pageNum) ? '#f8f9fa' : '#f1f3f4'),
                  filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
                }}
              />
              
              {page && viewport && isPageVisible && (
                <PdfTextLayer
                  pageNumber={pageNum}
                  page={page}
                  viewport={viewport}
                  scale={scale}
                  rotation={rotation}
                  isVisible={isPageVisible}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PdfPagesArea;
