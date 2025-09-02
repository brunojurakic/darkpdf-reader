import { useCallback } from "react"
import { PDFDocumentProxy } from "pdfjs-dist"

interface UsePdfRenderingProps {
  pdfDoc: PDFDocumentProxy | null
  scale: number
  rotation: number
  renderingPages: Set<number>
  setRenderingPages: React.Dispatch<React.SetStateAction<Set<number>>>
  setPageDimensions: React.Dispatch<
    React.SetStateAction<Map<number, { width: number; height: number }>>
  >
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>
}

export const usePdfRendering = ({
  pdfDoc,
  scale,
  rotation,
  renderingPages,
  setRenderingPages,
  setPageDimensions,
  canvasRefs,
}: UsePdfRenderingProps) => {
  const renderPage = useCallback(
    async (pageNumber: number) => {
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

        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = "high"

        const devicePixelRatio = window.devicePixelRatio || 1

        const effectiveScale = scale < 1.0 ? Math.max(scale, 0.5) : scale

        const outputScale = devicePixelRatio * effectiveScale

        const viewport = page.getViewport({
          scale: outputScale,
          rotation: rotation,
        })

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)

        const displayWidth = viewport.width / devicePixelRatio
        const displayHeight = viewport.height / devicePixelRatio

        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`

        setPageDimensions((prev) =>
          new Map(prev).set(pageNumber, {
            width: displayWidth,
            height: displayHeight,
          }),
        )

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
    },
    [
      pdfDoc,
      scale,
      rotation,
      renderingPages,
      setRenderingPages,
      setPageDimensions,
      canvasRefs,
    ],
  )

  return { renderPage }
}
