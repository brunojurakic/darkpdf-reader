import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface TextContent {
  items: Array<TextItem | { hasEOL?: boolean }>;
}

interface PdfTextLayerProps {
  pageNumber: number;
  page: unknown;
  viewport: unknown;
  scale: number;
  rotation: number;
  isVisible: boolean;
}

interface TextSelection {
  startIndex: number;
  endIndex: number;
  text: string;
}

interface TextPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  index: number;
}

const PdfTextLayer: React.FC<PdfTextLayerProps> = ({
  pageNumber,
  page,
  viewport,
  rotation,
  isVisible,
}) => {
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [textContent, setTextContent] = useState<TextContent | null>(null);
  const [textPositions, setTextPositions] = useState<TextPosition[]>([]);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [highlightRects, setHighlightRects] = useState<Array<{ x: number; y: number; width: number; height: number }>>([]);
  const [justFinishedSelecting, setJustFinishedSelecting] = useState(false);

  useEffect(() => {
    if (!page || !isVisible) return;

    const loadTextContent = async () => {
      try {
        const pageObj = page as { getTextContent(): Promise<TextContent> };
        const content = await pageObj.getTextContent();
        setTextContent(content);
      } catch (error) {
        console.error(`Error loading text content for page ${pageNumber}:`, error);
      }
    };

    loadTextContent();
  }, [page, isVisible, pageNumber]);

  
  useEffect(() => {
    if (!textContent || !viewport) return;

    const viewportObj = viewport as { transform: number[]; scale: number };
    const positions: TextPosition[] = [];
    let textIndex = 0;

    textContent.items.forEach((item) => {
      if ('str' in item && item.str.trim()) {
        const textItem = item as TextItem;
        
        
        const transform = viewportObj.transform;
        const x = transform[0] * textItem.transform[4] + transform[2] * textItem.transform[5] + transform[4];
        const y = transform[1] * textItem.transform[4] + transform[3] * textItem.transform[5] + transform[5];
        
        
        const width = textItem.width * viewportObj.scale;
        const height = textItem.height * viewportObj.scale;

        positions.push({
          x: x,
          y: y - height,
          width: width,
          height: height,
          text: textItem.str,
          index: textIndex,
        });

        textIndex++;
      }
    });

    setTextPositions(positions);
  }, [textContent, viewport]);

  // Handle mouse down for text selection
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelectionStart({ x: e.clientX, y: e.clientY });
    setSelection(null);
    setHighlightRects([]);
    setJustFinishedSelecting(false);
  };

  // Handle mouse move for text selection
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart || !textLayerRef.current) return;

    const rect = textLayerRef.current.getBoundingClientRect();
    const startX = selectionStart.x - rect.left;
    const startY = selectionStart.y - rect.top;
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    
    const selectionRect = {
      left: Math.min(startX, endX),
      right: Math.max(startX, endX),
      top: Math.min(startY, endY),
      bottom: Math.max(startY, endY),
    };

    
    const selectedItems: TextPosition[] = [];

    textPositions.forEach((pos) => {
      const itemRect = {
        left: pos.x,
        right: pos.x + pos.width,
        top: pos.y,
        bottom: pos.y + pos.height,
      };

      
      const intersects = !(
        itemRect.right < selectionRect.left ||
        itemRect.left > selectionRect.right ||
        itemRect.bottom < selectionRect.top ||
        itemRect.top > selectionRect.bottom
      );

      if (intersects) {
        selectedItems.push(pos);
      }
    });

    if (selectedItems.length > 0) {
      
      selectedItems.sort((a, b) => {
        const lineThreshold = 5;
        if (Math.abs(a.y - b.y) < lineThreshold) {
          
          return a.x - b.x;
        }
        
        return a.y - b.y;
      });

      const selectedText = selectedItems.map(item => item.text).join(' ');
      const startIndex = selectedItems[0].index;
      const endIndex = selectedItems[selectedItems.length - 1].index;

      setSelection({
        startIndex,
        endIndex,
        text: selectedText,
      });

      
      const rects = selectedItems.map(item => ({
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      }));
      setHighlightRects(rects);
    } else {
      setSelection(null);
      setHighlightRects([]);
    }
  };

  // Handle mouse up for text selection
  const handleMouseUp = () => {
    // Set flag to indicate we just finished selecting
    setJustFinishedSelecting(true);
    
    // Use a small delay before clearing isSelecting to prevent immediate click handling
    setTimeout(() => {
      setIsSelecting(false);
      setSelectionStart(null);
      
      
      setTimeout(() => {
        setJustFinishedSelecting(false);
      }, 200);
    }, 100);
  };

  // Copy selected text to clipboard
  const copyToClipboard = async () => {
    if (!selection) return;

    try {
      await navigator.clipboard.writeText(selection.text);
      toast.success(`Copied: "${selection.text.substring(0, 50)}${selection.text.length > 50 ? '...' : ''}"`);
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
      
      const textArea = document.createElement('textarea');
      textArea.value = selection.text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast.success('Text copied to clipboard');
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selection) {
        e.preventDefault();
        copyToClipboard();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a' && textPositions.length > 0) {
        e.preventDefault();
        
        const sortedItems = [...textPositions].sort((a, b) => {
          const lineThreshold = 5;
          if (Math.abs(a.y - b.y) < lineThreshold) {
            return a.x - b.x;
          }
          return a.y - b.y;
        });

        const allText = sortedItems.map(item => item.text).join(' ');

        setSelection({
          startIndex: sortedItems[0].index,
          endIndex: sortedItems[sortedItems.length - 1].index,
          text: allText,
        });

        setHighlightRects(sortedItems.map(item => ({
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        })));
      } else if (e.key === 'Escape') {
        setSelection(null);
        setHighlightRects([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selection, textPositions]);

  // Handle double-click for word selection
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!textLayerRef.current) return;

    const rect = textLayerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Find the clicked text item
    const clickedItem = textPositions.find(pos => 
      clickX >= pos.x && clickX <= pos.x + pos.width &&
      clickY >= pos.y && clickY <= pos.y + pos.height
    );

    if (clickedItem) {
        
      setSelection({
        startIndex: clickedItem.index,
        endIndex: clickedItem.index,
        text: clickedItem.text,
      });

      setHighlightRects([{
        x: clickedItem.x,
        y: clickedItem.y,
        width: clickedItem.width,
        height: clickedItem.height,
      }]);
    }
  };

  // Clear selection when clicking outside (but not during text selection)
  const handleClick = (e: React.MouseEvent) => {
    // Only clear selection if this is a single click and we're not actively selecting text
    // and we didn't just finish selecting text
    if (e.detail === 1 && !isSelecting && !selectionStart && !justFinishedSelecting) {
      
      if (selection && highlightRects.length > 0) {
        const rect = textLayerRef.current?.getBoundingClientRect();
        if (rect) {
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          
          
          const clickedOutside = !highlightRects.some(highlightRect => 
            clickX >= highlightRect.x && clickX <= highlightRect.x + highlightRect.width &&
            clickY >= highlightRect.y && clickY <= highlightRect.y + highlightRect.height
          );
          
          if (clickedOutside) {
            setSelection(null);
            setHighlightRects([]);
          }
        }
      }
    }
  };

  if (!textContent || !isVisible) {
    return null;
  }

  const layerStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
  };

  const highlightStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
  };

  return (
    <>
      {/* Text layer for interaction */}
      <div
        ref={textLayerRef}
        style={layerStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
        className="pdf-text-layer"
      >
        {textPositions.map((pos, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: pos.width,
              height: pos.height,
              fontSize: pos.height,
              fontFamily: 'sans-serif',
            }}
            className="pdf-text-item"
          >
            {pos.text}
          </div>
        ))}
      </div>

      {/* Highlight layer */}
      <div style={highlightStyle}>
        {highlightRects.map((rect, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
            className="pdf-text-selection"
          />
        ))}
      </div>
    </>
  );
};

export default PdfTextLayer;
