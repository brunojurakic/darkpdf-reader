import React, { useEffect, useRef, useState, useCallback } from "react"
import PdfToolbar from "./pdf/PdfToolbar"
import PdfFileUploadCard from "./pdf/PdfFileUploadCard"
import PdfLoadingCard from "./pdf/PdfLoadingCard"
import PdfErrorCard from "./pdf/PdfErrorCard"
import PdfPagesArea from "./pdf/PdfPagesArea"
import { generatePdfHash } from "@/lib/bookmarks"
import { toast } from "sonner"
import { usePdfLoader } from "@/hooks/usePdfLoader"
import { usePdfControls } from "@/hooks/usePdfControls"
import { usePageNavigation } from "@/hooks/usePageNavigation"
import { usePdfRendering } from "@/hooks/usePdfRendering"
import { usePdfScroll } from "@/hooks/usePdfScroll"
import { usePdfVisibility } from "@/hooks/usePdfVisibility"

interface PdfViewerContainerProps {
  pdfData: ArrayBuffer | null
  onPdfDataChange: (data: ArrayBuffer | null) => void
}

const PdfViewerContainer: React.FC<PdfViewerContainerProps> = ({
  pdfData,
  onPdfDataChange,
}) => {
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set())
  const [renderingPages, setRenderingPages] = useState<Set<number>>(new Set())
  const [pageDimensions, setPageDimensions] = useState<
    Map<number, { width: number; height: number }>
  >(new Map())
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [pdfHash, setPdfHash] = useState<string>("")

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

  const { pdfDoc, numPages, error, loading, loadingProgress } =
    usePdfLoader(pdfData)

  const {
    scale,
    rotation,
    customZoomInput,
    handleZoomIn,
    handleZoomOut,
    handleRotate,
    handleCustomZoomChange,
    handleCustomZoomSubmit,
    handleCustomZoomKeyDown,
    setScale,
    resetControls,
  } = usePdfControls()

  const {
    currentPage,
    pageInput,
    handlePageChange,
    handlePageSubmit: originalHandlePageSubmit,
    handlePageKeyDown,
    setCurrentPage,
  } = usePageNavigation(numPages)

  const { renderPage } = usePdfRendering({
    pdfDoc,
    scale,
    rotation,
    renderingPages,
    setRenderingPages,
    setPageDimensions,
    canvasRefs,
  })

  const { scrollToPage } = usePdfScroll({
    pdfDoc,
    numPages,
    pageDimensions,
    renderingPages,
    setCurrentPage,
    renderPage,
    canvasRefs,
    pageRefs,
    scrollAreaRef,
  })

  const { checkVisiblePages, handleScroll, cleanup } = usePdfVisibility({
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
  })

  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"))
    }

    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (pdfData) {
      const hash = generatePdfHash(pdfData)
      setPdfHash(hash)
    }
  }, [pdfData])

  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      setPageDimensions(new Map())
      setRenderingPages(new Set())

      const pagesToRerender = new Set<number>()
      const start = Math.max(1, currentPage - 1)
      const end = Math.min(numPages, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pagesToRerender.add(i)
      }

      visiblePages.forEach((pageNum) => pagesToRerender.add(pageNum))

      setTimeout(() => {
        pagesToRerender.forEach((pageNumber) => {
          renderPage(pageNumber)
        })
        setTimeout(checkVisiblePages, 300)
      }, 50)
    }
  }, [pdfDoc, numPages, scale])

  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      setTimeout(checkVisiblePages, 100)
    }
  }, [pdfDoc, numPages])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  useEffect(() => {
    if (pdfDoc && !loading && !error && viewerRef.current) {
      viewerRef.current.focus()
    }
  }, [pdfDoc, loading, error])

  const handlePageSubmit = useCallback(() => {
    const pageNum = parseInt(pageInput, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      scrollToPage(pageNum)
    } else {
      originalHandlePageSubmit()
    }
  }, [pageInput, numPages, scrollToPage, originalHandlePageSubmit])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        onPdfDataChange(reader.result as ArrayBuffer)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleLoadNewPdf = () => {
    onPdfDataChange(null)
    resetControls()
    setVisiblePages(new Set())
    setRenderingPages(new Set())
    setPageDimensions(new Map())
    setPdfHash("")
    canvasRefs.current = []
    pageRefs.current = []
  }

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newScale = Math.max(0.75, Math.min(4, scale + delta))
      setScale(newScale)
    }
  }

  const copyAllDocumentText = useCallback(async () => {
    if (!pdfDoc) return
    try {
      const pages = [] as string[]
      for (let i = 1; i <= numPages; i++) {
        const pageObj = await (
          pdfDoc as unknown as { getPage(n: number): Promise<unknown> }
        ).getPage(i)
        const content = await (
          pageObj as unknown as {
            getTextContent(): Promise<{ items: Array<{ str?: string }> }>
          }
        ).getTextContent()
        const text = content.items
          .map((it) => (typeof it.str === "string" ? it.str : ""))
          .filter((s): s is string => Boolean(s))
          .join(" ")
        pages.push(text)
      }
      const all = pages.join("\n\n")
      await navigator.clipboard.writeText(all)
      toast.success(
        `Copied all text from ${numPages} page${numPages > 1 ? "s" : ""}`,
      )
    } catch (err) {
      console.error("Failed to copy all document text", err)
      toast.error("Failed to copy all document text")
    }
  }, [pdfDoc, numPages])

  return (
    <div className="h-full flex flex-col">
      {pdfData && !loading && !error && (
        <PdfToolbar
          numPages={numPages}
          pageInput={pageInput}
          onPageChange={handlePageChange}
          onPageSubmit={handlePageSubmit}
          onPageKeyDown={handlePageKeyDown}
          scale={scale}
          customZoomInput={customZoomInput}
          onCustomZoomChange={handleCustomZoomChange}
          onCustomZoomSubmit={handleCustomZoomSubmit}
          onCustomZoomKeyDown={handleCustomZoomKeyDown}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRotate={handleRotate}
          onLoadNewPdf={handleLoadNewPdf}
          pdfHash={pdfHash}
          currentPage={currentPage}
          onGoToPage={scrollToPage}
        />
      )}

      {!pdfData && <PdfFileUploadCard onFileChange={handleFileChange} />}

      {loading && <PdfLoadingCard loadingProgress={loadingProgress} />}

      {error && <PdfErrorCard error={error} />}

      {pdfData && !loading && !error && (
        <div
          ref={viewerRef}
          className="flex-1 overflow-hidden outline-none"
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey) {
              const target = e.target as HTMLElement
              const isEditable =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable

              if (!isEditable && e.key.toLowerCase() === "a") {
                e.preventDefault()
                copyAllDocumentText()
                return
              }

              switch (e.key) {
                case "=":
                case "+":
                  e.preventDefault()
                  handleZoomIn()
                  break
                case "-":
                  e.preventDefault()
                  handleZoomOut()
                  break
                case "0":
                  e.preventDefault()
                  console.log("Reset zoom")
                  break
              }
            } else {
              switch (e.key) {
                case "ArrowLeft":
                  e.preventDefault()
                  if (currentPage > 1) {
                    scrollToPage(currentPage - 1)
                  }
                  break
                case "ArrowRight":
                  e.preventDefault()
                  if (currentPage < numPages) {
                    scrollToPage(currentPage + 1)
                  }
                  break
                case "ArrowUp":
                  e.preventDefault()
                  if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollBy({ top: -100 })
                  }
                  break
                case "ArrowDown":
                  e.preventDefault()
                  if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollBy({ top: 100 })
                  }
                  break
              }
            }
          }}
          onMouseDown={() => {
            setTimeout(() => {
              if (viewerRef.current) {
                viewerRef.current.focus()
              }
            }, 0)
          }}
          tabIndex={0}
        >
          <div
            ref={scrollAreaRef}
            className="h-full w-full overflow-auto"
            onScroll={handleScroll}
            onWheel={handleWheelZoom}
          >
            <PdfPagesArea
              numPages={numPages}
              pageDimensions={pageDimensions}
              visiblePages={visiblePages}
              rotation={rotation}
              canvasRefs={canvasRefs}
              pageRefs={pageRefs}
              isDarkMode={isDarkMode}
              pdfDoc={pdfDoc}
              scale={scale}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default PdfViewerContainer
