import React from "react"
import { PDFPageProxy, PDFDocumentProxy } from "pdfjs-dist"
import PdfTextLayer from "./PdfTextLayer"

interface PdfPagesAreaProps {
  numPages: number
  pageDimensions: Map<number, { width: number; height: number }>
  visiblePages: Set<number>
  rotation: number
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  isDarkMode: boolean
  pdfDoc: PDFDocumentProxy | null
  scale: number
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
  const [pageObjects, setPageObjects] = React.useState<
    Map<number, PDFPageProxy>
  >(new Map())
  const [viewports, setViewports] = React.useState<
    Map<
      number,
      { width: number; height: number; transform: number[]; scale: number }
    >
  >(new Map())

  React.useEffect(() => {
    if (!pdfDoc) return

    const loadPages = async () => {
      const newPageObjects = new Map(pageObjects)
      const newViewports = new Map(viewports)

      for (const pageNum of visiblePages) {
        try {
          let page = newPageObjects.get(pageNum)
          if (!page) {
            page = await pdfDoc.getPage(pageNum)
            newPageObjects.set(pageNum, page)
          }

          const dims = pageDimensions.get(pageNum)
          if (dims) {
            const baseViewport = page.getViewport({ scale: 1 })
            const derivedScale = dims.width / baseViewport.width
            const viewport = page.getViewport({ scale: derivedScale })
            newViewports.set(pageNum, viewport)
          } else {
            const viewport = page.getViewport({ scale })
            newViewports.set(pageNum, viewport)
          }
        } catch (error) {
          console.error(`Error loading page ${pageNum}:`, error)
        }
      }

      setPageObjects(newPageObjects)
      setViewports(newViewports)
    }

    loadPages()
  }, [pdfDoc, visiblePages, scale, pageDimensions])

  return (
    <div className="p-6 min-w-max w-full flex flex-col gap-4 items-center">
      {Array.from({ length: numPages }, (_, i) => {
        const pageNum = i + 1
        const dimensions = pageDimensions.get(pageNum)
        const estimatedHeight = dimensions?.height || 600
        const estimatedWidth = dimensions?.width || 400
        const page = pageObjects.get(pageNum)
        const viewport = viewports.get(pageNum)
        const isPageVisible = visiblePages.has(pageNum)

        return (
          <div
            key={i}
            ref={(el) => {
              pageRefs.current[i] = el
            }}
            className="flex flex-col items-center relative"
            style={{ minHeight: `${estimatedHeight + 50}px` }}
          >
            <div
              className={`shadow-lg rounded-lg overflow-hidden border flex-shrink-0 relative ${
                isDarkMode ? "bg-black" : "bg-white"
              }`}
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <canvas
                ref={(el) => {
                  canvasRefs.current[i] = el
                }}
                className="block"
                style={{
                  minWidth: `${estimatedWidth}px`,
                  minHeight: `${estimatedHeight}px`,
                  backgroundColor: isDarkMode
                    ? visiblePages.has(pageNum)
                      ? "#1a1a1a"
                      : "#0f0f0f"
                    : visiblePages.has(pageNum)
                      ? "#f8f9fa"
                      : "#f1f3f4",
                  filter: isDarkMode ? "invert(1) hue-rotate(180deg)" : "none",
                  imageRendering: "crisp-edges",
                  WebkitFontSmoothing: "antialiased",
                  MozOsxFontSmoothing: "grayscale",
                }}
              />

              {page && viewport && isPageVisible && (
                <PdfTextLayer
                  pageNumber={pageNum}
                  page={page}
                  viewport={viewport}
                  isVisible={isPageVisible}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PdfPagesArea
