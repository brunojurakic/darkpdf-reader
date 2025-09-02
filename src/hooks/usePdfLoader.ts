import { useState, useEffect } from "react"
import { PDFDocumentProxy, getDocument } from "pdfjs-dist"

interface UsePdfLoaderResult {
  pdfDoc: PDFDocumentProxy | null
  numPages: number
  error: string | null
  loading: boolean
  loadingProgress: number
}

export const usePdfLoader = (
  pdfData: ArrayBuffer | null,
): UsePdfLoaderResult => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    if (!pdfData) {
      setPdfDoc(null)
      setNumPages(0)
      setError(null)
      setLoading(false)
      setLoadingProgress(0)
      return
    }

    const loadPdf = async () => {
      try {
        setLoading(true)
        setLoadingProgress(0)
        setError(null)

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

  return { pdfDoc, numPages, error, loading, loadingProgress }
}
