import React, { useEffect, useRef, useState, useCallback } from "react"
import { GlobalWorkerOptions } from "pdfjs-dist"
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

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

const PdfViewer: React.FC = () => {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set())
  const [renderingPages, setRenderingPages] = useState<Set<number>>(new Set())
  const [pageDimensions, setPageDimensions] = useState<
    Map<number, { width: number; height: number }>
  >(new Map())
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [pdfHash, setPdfHash] = useState<string>("")

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

        setRenderingPages((prev) => {
          const newSet = new Set(prev)
          for (let i = start; i <= end; i++) {
            newSet.delete(i)
          }
          return newSet
        })

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
    [pdfDoc, pageDimensions, renderingPages, numPages, setCurrentPage],
  )

  const handlePageSubmit = useCallback(() => {
    const pageNum = parseInt(pageInput, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      scrollToPage(pageNum)
    } else {
      originalHandlePageSubmit()
    }
  }, [pageInput, numPages, scrollToPage, originalHandlePageSubmit])

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

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

  const renderPage = async (pageNumber: number) => {
    if (!pdfDoc) return

    if (renderingPages.has(pageNumber)) {
      return
    }

    setRenderingPages((prev) => new Set(prev).add(pageNumber))

    try {
      const page = await pdfDoc.getPage(pageNumber)
      const canvas = canvasRefs.current[pageNumber - 1]
      if (!canvas) {
        setRenderingPages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(pageNumber)
          return newSet
        })
        return
      }

      const context = canvas.getContext("2d")
      if (!context) {
        setRenderingPages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(pageNumber)
          return newSet
        })
        return
      }

      const devicePixelRatio = window.devicePixelRatio || 1
      const baseScale = Math.max(scale, 1.5)
      const outputScale = devicePixelRatio * baseScale

      const viewport = page.getViewport({ scale: outputScale })

      const displayWidth =
        (viewport.width / devicePixelRatio) * (scale / baseScale)
      const displayHeight =
        (viewport.height / devicePixelRatio) * (scale / baseScale)

      setPageDimensions((prev) =>
        new Map(prev).set(pageNumber, {
          width: displayWidth,
          height: displayHeight,
        }),
      )

      canvas.style.width = `${displayWidth}px`
      canvas.style.height = `${displayHeight}px`

      canvas.width = viewport.width
      canvas.height = viewport.height

      context.clearRect(0, 0, canvas.width, canvas.height)

      await page.render({
        canvasContext: context,
        canvas,
        viewport: viewport,
      }).promise
    } catch (error) {
      console.error(`Error rendering page ${pageNumber}:`, error)
    } finally {
      setRenderingPages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(pageNumber)
        return newSet
      })
    }
  }

  const checkVisiblePages = () => {
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
  }

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleScroll = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(checkVisiblePages, 50)
  }

  const handleZoomUpdate = () => {
    if (!pdfDoc || numPages === 0) return

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

  useEffect(() => {
    handleZoomUpdate()
  }, [pdfDoc, numPages, scale])

  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      setTimeout(checkVisiblePages, 100)
    }
  }, [pdfDoc, numPages])

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (pdfDoc && !loading && !error && viewerRef.current) {
      viewerRef.current.focus()
    }
  }, [pdfDoc, loading, error])


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setPdfData(reader.result as ArrayBuffer)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleLoadNewPdf = () => {
    setPdfData(null)
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

  const copyAllDocumentText = async () => {
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
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
            scrollAreaRef.current.scrollBy({
              top: -100, // Scroll up by 100px
            })
          }
          break
        case "ArrowDown":
          e.preventDefault()
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollBy({
              top: 100, // Scroll down by 100px
            })
          }
          break
      }
    }
  }

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
          onKeyDown={handleKeyDown}
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

export default PdfViewer
