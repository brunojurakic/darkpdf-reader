import React, { useCallback } from "react"
import { PDFDocumentProxy } from "pdfjs-dist"

interface UsePdfScrollProps {
  pdfDoc: PDFDocumentProxy | null
  numPages: number
  pageDimensions: Map<number, { width: number; height: number }>
  renderingPages: Set<number>
  setCurrentPage: (page: number) => void
  renderPage: (pageNumber: number) => void
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  scrollAreaRef: React.MutableRefObject<HTMLDivElement | null>
}

export const usePdfScroll = ({
  pdfDoc,
  numPages,
  pageDimensions,
  renderingPages,
  setCurrentPage,
  renderPage,
  canvasRefs,
  pageRefs,
  scrollAreaRef,
}: UsePdfScrollProps) => {
  const scrollToPage = useCallback(
    (pageNumber: number) => {
      if (!scrollAreaRef.current || !pdfDoc) return

      const scrollArea = scrollAreaRef.current
      const pageElement = pageRefs.current[pageNumber - 1]

      const isPageRendered = pageDimensions.has(pageNumber)
      const hasValidPosition = pageElement && pageElement.offsetTop > 0

      if (isPageRendered && hasValidPosition) {
        const elementTop = pageElement.offsetTop
        scrollArea.scrollTo({
          top: elementTop - 20,
          behavior: "smooth",
        })
        setCurrentPage(pageNumber)
      } else {
        let estimatedPageHeight = 600
        const renderedDimensions = Array.from(pageDimensions.values())
        if (renderedDimensions.length > 0) {
          const totalHeight = renderedDimensions.reduce(
            (sum, dim) => sum + dim.height,
            0,
          )
          estimatedPageHeight = totalHeight / renderedDimensions.length
        }

        const containerPadding = 48
        const gapBetweenPages = 16
        const pageMargin = 50
        const effectivePageHeight =
          estimatedPageHeight + gapBetweenPages + pageMargin
        const estimatedTop =
          containerPadding + (pageNumber - 1) * effectivePageHeight

        scrollArea.scrollTo({
          top: Math.max(0, estimatedTop - 20),
          behavior: "smooth",
        })

        const start = Math.max(1, pageNumber - 1)
        const end = Math.min(numPages, pageNumber + 1)

        setTimeout(() => {
          for (let i = start; i <= end; i++) {
            if (!renderingPages.has(i)) {
              renderPage(i)
            }
          }

          setCurrentPage(pageNumber)

          setTimeout(() => {
            const targetElement = pageRefs.current[pageNumber - 1]
            if (targetElement && targetElement.offsetTop > 0) {
              scrollArea.scrollTo({
                top: targetElement.offsetTop - 20,
                behavior: "smooth",
              })
            }
          }, 400)
        }, 50)
      }
    },
    [
      pdfDoc,
      pageDimensions,
      renderingPages,
      numPages,
      setCurrentPage,
      renderPage,
      canvasRefs,
      pageRefs,
      scrollAreaRef,
    ],
  )

  return { scrollToPage }
}
