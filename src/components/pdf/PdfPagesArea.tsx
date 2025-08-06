import React from 'react';

interface PdfPagesAreaProps {
  numPages: number;
  pageDimensions: Map<number, { width: number; height: number }>;
  visiblePages: Set<number>;
  rotation: number;
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

const PdfPagesArea: React.FC<PdfPagesAreaProps> = ({
  numPages,
  pageDimensions,
  visiblePages,
  rotation,
  canvasRefs,
  pageRefs,
}) => (
  <div className="p-6 min-w-max w-full flex flex-col gap-4 items-center">
    {Array.from({ length: numPages }, (_, i) => {
      const pageNum = i + 1;
      const dimensions = pageDimensions.get(pageNum);
      const estimatedHeight = dimensions?.height || 600;
      const estimatedWidth = dimensions?.width || 400;
      return (
        <div
          key={i}
          ref={el => { pageRefs.current[i] = el; }}
          className="flex flex-col items-center"
          style={{ minHeight: `${estimatedHeight + 50}px` }}
        >
          <div
            className="shadow-lg rounded-lg overflow-hidden border bg-white flex-shrink-0"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <canvas
              ref={el => { canvasRefs.current[i] = el; }}
              className="block"
              style={{
                minWidth: `${estimatedWidth}px`,
                minHeight: `${estimatedHeight}px`,
                backgroundColor: visiblePages.has(pageNum) ? '#ffffff' : '#f8f9fa',
              }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

export default PdfPagesArea;
