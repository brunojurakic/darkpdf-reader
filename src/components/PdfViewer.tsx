import React, { useEffect, useRef, useState } from "react"
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist"
import PdfToolbar from "./pdf/PdfToolbar"
import PdfFileUploadCard from "./pdf/PdfFileUploadCard"
import PdfLoadingCard from "./pdf/PdfLoadingCard"
import PdfErrorCard from "./pdf/PdfErrorCard"
import PdfPagesArea from "./pdf/PdfPagesArea"
import { generatePdfHash } from "@/lib/bookmarks"
import { toast } from "sonner"

type PDFPageViewport = {
  width: number
  height: number
}

type PDFDocumentProxy = {
  numPages: number
  getPage(pageNumber: number): Promise<{
    getViewport: (opts: { scale: number }) => PDFPageViewport
    render: (params: {
      canvasContext: CanvasRenderingContext2D
      canvas: HTMLCanvasElement
      viewport: PDFPageViewport
    }) => { promise: Promise<void> }
  }>
}

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

const PdfViewer: React.FC = () => {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [scale, setScale] = useState(2)
  const [rotation, setRotation] = useState(0)
  const [customZoomInput, setCustomZoomInput] = useState("200%")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState("1")
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
    if (!pdfData) return
    const loadPdf = async () => {
      try {
        setLoading(true)
        setLoadingProgress(0)
        setError(null)

        const hash = generatePdfHash(pdfData)
        setPdfHash(hash)

        const loadingTask = getDocument({ data: pdfData })
        loadingTask.onProgress = (progress: {
          loaded: number
          total: number
        }) => {
          if (progress.total) {
            setLoadingProgress((progress.loaded / progress.total) * 100)
          }
        }

        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
        setNumPages(pdf.numPages)
        setLoadingProgress(100)
      } catch (e) {
        setError("Failed to load PDF. Please make sure it's a valid PDF file.")
        setPdfDoc(null)
        setNumPages(0)
      } finally {
        setLoading(false)
      }
    }
    loadPdf()
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
        setPageInput(bestPage.toString())
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

  useEffect(() => {
    setCustomZoomInput(Math.round(scale * 100).toString() + "%")
  }, [scale])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setPdfData(reader.result as ArrayBuffer)
      }
      reader.onerror = () => {
        setError("Failed to read file.")
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.5, 4)
    setScale(newScale)
    setCustomZoomInput(Math.round(newScale * 100).toString() + "%")
    setTimeout(() => {
      if (viewerRef.current) {
        viewerRef.current.focus()
      }
    }, 0)
  }

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.5, 0.75)
    setScale(newScale)
    setCustomZoomInput(Math.round(newScale * 100).toString() + "%")
    setTimeout(() => {
      if (viewerRef.current) {
        viewerRef.current.focus()
      }
    }, 0)
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
    setTimeout(() => {
      if (viewerRef.current) {
        viewerRef.current.focus()
      }
    }, 0)
  }

  const handleLoadNewPdf = () => {
    setPdfData(null)
    setPdfDoc(null)
    setNumPages(0)
    setError(null)
    setLoading(false)
    setLoadingProgress(0)
    setScale(2)
    setRotation(0)
    setCustomZoomInput("200%")
    setCurrentPage(1)
    setPageInput("1")
    setVisiblePages(new Set())
    setRenderingPages(new Set())
    setPageDimensions(new Map())
    setPdfHash("")
    canvasRefs.current = []
    pageRefs.current = []
  }

  const handleCustomZoomChange = (value: string) => {
    let newValue = value

    newValue = newValue.replace(/%/g, "")

    newValue = newValue.replace(/[^\d]/g, "")

    newValue = newValue + "%"

    setCustomZoomInput(newValue)
  }

  const handleCustomZoomSubmit = () => {
    const numericValue = customZoomInput.replace("%", "")
    const numValue = parseInt(numericValue, 10)

    if (!isNaN(numValue) && numValue >= 75 && numValue <= 400) {
      const newScale = numValue / 100
      setScale(newScale)
      setCustomZoomInput(Math.round(newScale * 100).toString() + "%")
    } else {
      setCustomZoomInput(Math.round(scale * 100).toString() + "%")
    }
    setTimeout(() => {
      if (viewerRef.current) {
        viewerRef.current.focus()
      }
    }, 0)
  }

  const handleCustomZoomKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      handleCustomZoomSubmit()
      e.currentTarget.blur()
    } else if (e.key === "Escape") {
      setCustomZoomInput(Math.round(scale * 100).toString() + "%")
      e.currentTarget.blur()
    }
  }

  const handlePageChange = (value: string) => {
    setPageInput(value)
  }

  const handlePageSubmit = () => {
    const pageNum = parseInt(pageInput, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      scrollToPage(pageNum)
    } else {
      setPageInput(currentPage.toString())
    }
    setTimeout(() => {
      if (viewerRef.current) {
        viewerRef.current.focus()
      }
    }, 0)
  }

  const handlePageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageSubmit()
      e.currentTarget.blur()
    } else if (e.key === "Escape") {
      setPageInput(currentPage.toString())
      e.currentTarget.blur()
    }
  }

  const scrollToPage = (pageNumber: number) => {
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

      console.log(
        `Scrolling to page ${pageNumber}, estimated top: ${estimatedTop}, page height: ${estimatedPageHeight}`,
      )

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
          renderPage(i)
        }

        setCurrentPage(pageNumber)
        setPageInput(pageNumber.toString())

        setTimeout(checkVisiblePages, 400)

        setTimeout(() => {
          const targetElement = pageRefs.current[pageNumber - 1]
          if (targetElement && targetElement.offsetTop > 0) {
            scrollArea.scrollTo({
              top: targetElement.offsetTop - 20,
              behavior: "smooth",
            })
          }
        }, 600)
      }, 50)
    }
  }

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newScale = Math.max(0.75, Math.min(4, scale + delta))
      setScale(newScale)
      setCustomZoomInput(Math.round(newScale * 100).toString() + "%")
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
          {
            const newScale = 1
            setScale(newScale)
            setCustomZoomInput(Math.round(newScale * 100).toString() + "%")
          }
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
          onWheel={handleWheelZoom}
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
