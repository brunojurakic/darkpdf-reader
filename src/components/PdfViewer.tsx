import React, { useState } from "react"
import { GlobalWorkerOptions } from "pdfjs-dist"
import PdfViewerContainer from "./PdfViewerContainer"

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

const PdfViewer: React.FC = () => {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)

  return <PdfViewerContainer pdfData={pdfData} onPdfDataChange={setPdfData} />
}

export default PdfViewer
