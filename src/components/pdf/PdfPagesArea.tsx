import React from 'react';

interface PdfPagesAreaProps {
  numPages: number;
  pageDimensions: Map<number, { width: number; height: number }>;
  visiblePages: Set<number>;
  rotation: number;
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  isDarkMode: boolean;
}

const PdfPagesArea: React.FC<PdfPagesAreaProps> = ({
  numPages,
  pageDimensions,
  visiblePages,
  rotation,
  canvasRefs,
  pageRefs,
  isDarkMode,
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
            className={`shadow-lg rounded-lg overflow-hidden border flex-shrink-0 ${
              isDarkMode ? 'bg-black' : 'bg-white border-gray-200'
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
                  : (visiblePages.has(pageNum) ? '#ffffff' : '#f8f9fa'),
                filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
              }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

export default PdfPagesArea;
