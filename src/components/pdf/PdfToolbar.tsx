import React from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCw, FileText } from "lucide-react"

interface PdfToolbarProps {
  numPages: number
  pageInput: string
  onPageChange: (value: string) => void
  onPageSubmit: () => void
  onPageKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  scale: number
  customZoomInput: string
  onCustomZoomChange: (value: string) => void
  onCustomZoomSubmit: () => void
  onCustomZoomKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onRotate: () => void
}

const PdfToolbar: React.FC<PdfToolbarProps> = ({
  numPages,
  pageInput,
  onPageChange,
  onPageSubmit,
  onPageKeyDown,
  scale,
  customZoomInput,
  onCustomZoomChange,
  onCustomZoomSubmit,
  onCustomZoomKeyDown,
  onZoomIn,
  onZoomOut,
  onRotate,
}) => (
  <div className="border-b bg-card px-4 py-2 flex-shrink-0">
    <div className="flex items-center justify-between relative">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Page</span>
        <input
          type="text"
          value={pageInput}
          onChange={(e) => onPageChange(e.target.value)}
          onBlur={onPageSubmit}
          onKeyDown={onPageKeyDown}
          className="w-12 px-2 py-1 text-sm text-center border rounded bg-background text-foreground"
          placeholder="1"
        />
        <span className="text-sm text-muted-foreground">of {numPages}</span>
      </div>
      <div className="flex items-center justify-center gap-2 absolute left-1/2 transform -translate-x-1/2">
        <Button
          variant="outline"
          size="sm"
          onClick={onZoomOut}
          disabled={scale <= 0.75}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="flex items-center">
          <input
            type="text"
            value={customZoomInput}
            onChange={(e) => onCustomZoomChange(e.target.value)}
            onBlur={onCustomZoomSubmit}
            onKeyDown={onCustomZoomKeyDown}
            className="w-16 px-2 py-1 text-sm text-center border rounded bg-background text-foreground"
            placeholder="100%"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onZoomIn}
          disabled={scale >= 4}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="outline" size="sm" onClick={onRotate}>
        <RotateCw className="h-4 w-4" />
      </Button>
    </div>
  </div>
)

export default PdfToolbar
