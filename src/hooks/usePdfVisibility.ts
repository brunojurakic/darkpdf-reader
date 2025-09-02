import { useCallback, useRef } from "react"
import { PDFDocumentProxy } from "pdfjs-dist"

interface UsePdfVisibilityProps {
  pdfDoc: PDFDocumentProxy | null
  numPages: number
  visiblePages: Set<number>
  renderingPages: Set<number>
  currentPage: number
  setVisiblePages: React.Dispatch<React.SetStateAction<Set<number>>>
  setCurrentPage: (page: number) => void
  renderPage: (pageNumber: number) => void
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  scrollAreaRef: React.MutableRefObject<HTMLDivElement | null>
}

export const usePdfVisibility = ({
  pdfDoc,
  numPages,
  visiblePages,
  renderingPages,
  currentPage,
  setVisiblePages,
  setCurrentPage,
  renderPage,
  pageRefs,
  scrollAreaRef,
}: UsePdfVisibilityProps) => {
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const checkVisiblePages = useCallback(() => {
    if (!scrollAreaRef.current || !pdfDoc) return

    const scrollArea = scrollAreaRef.current
    const scrollTop = scrollArea.scrollTop
    const scrollBottom = scrollTop + scrollArea.clientHeight
    const buffer = scrollArea.clientHeight * 0.5

    const newVisiblePages = new Set<number>()
    const pagesToRender = new Set<number>()

    for (let i = 0; i < numPages; i++) {
      const pageElement = pageRefs.current[i]
      if (!pageElement) continue

      const rect = pageElement.getBoundingClientRect()
      const parentRect = scrollArea.getBoundingClientRect()
      const relativeTop = rect.top - parentRect.top + scrollTop
      const relativeBottom = relativeTop + rect.height

      if (
        relativeBottom >= scrollTop - buffer &&
        relativeTop <= scrollBottom + buffer
      ) {
        newVisiblePages.add(i + 1)
        pagesToRender.add(i + 1)
      }
    }

    const allVisibleArray = Array.from(newVisiblePages).sort((a, b) => a - b)
    if (allVisibleArray.length > 0) {
      const firstVisible = allVisibleArray[0]
      const lastVisible = allVisibleArray[allVisibleArray.length - 1]

      for (
        let i = Math.max(1, firstVisible - 2);
        i <= Math.min(numPages, lastVisible + 2);
        i++
      ) {
        pagesToRender.add(i)
      }
    }

    pagesToRender.forEach((pageNumber) => {
      if (!visiblePages.has(pageNumber) && !renderingPages.has(pageNumber)) {
        renderPage(pageNumber)
      }
    })

    setVisiblePages(newVisiblePages)

    if (newVisiblePages.size > 0) {
      let bestPage = currentPage
      let bestVisibility = 0

      for (const pageNum of newVisiblePages) {
        const pageElement = pageRefs.current[pageNum - 1]
        if (!pageElement) continue

        const rect = pageElement.getBoundingClientRect()
        const parentRect = scrollArea.getBoundingClientRect()
        const relativeTop = rect.top - parentRect.top + scrollTop
        const relativeBottom = relativeTop + rect.height

        const visibleTop = Math.max(relativeTop, scrollTop)
        const visibleBottom = Math.min(relativeBottom, scrollBottom)
        const visibleHeight = Math.max(0, visibleBottom - visibleTop)
        const pageHeight = rect.height
        const visibilityRatio = visibleHeight / pageHeight

        if (visibilityRatio > 0.3 && visibilityRatio > bestVisibility) {
          bestPage = pageNum
          bestVisibility = visibilityRatio
        }
      }

      if (bestPage !== currentPage) {
        setCurrentPage(bestPage)
      }
    }
  }, [
    pdfDoc,
    numPages,
    visiblePages,
    renderingPages,
    currentPage,
    setVisiblePages,
    setCurrentPage,
    renderPage,
    pageRefs,
    scrollAreaRef,
  ])

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(checkVisiblePages, 50)
  }, [checkVisiblePages])

  const cleanup = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  return { checkVisiblePages, handleScroll, cleanup }
}
