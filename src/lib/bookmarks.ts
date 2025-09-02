export interface Bookmark {
  id: string
  page: number
  title: string
  createdAt: string
}

export interface PdfBookmarks {
  pdfHash: string
  bookmarks: Bookmark[]
}

export const generatePdfHash = (pdfData: ArrayBuffer): string => {
  const dataView = new Uint8Array(pdfData)
  let hash = 0

  const sampleSize = Math.min(1000, dataView.length)
  const step = Math.max(1, Math.floor(dataView.length / sampleSize))

  for (let i = 0; i < dataView.length; i += step) {
    hash = ((hash << 5) - hash + dataView[i]) | 0
  }

  return Math.abs(hash).toString(36)
}

export const getBookmarksForPdf = (pdfHash: string): Bookmark[] => {
  try {
    const stored = localStorage.getItem(`pdf-bookmarks-${pdfHash}`)
    if (!stored) return []

    const data: PdfBookmarks = JSON.parse(stored)
    return data.bookmarks || []
  } catch (error) {
    console.error("Error loading bookmarks:", error)
    return []
  }
}

export const saveBookmarksForPdf = (
  pdfHash: string,
  bookmarks: Bookmark[],
): void => {
  try {
    const data: PdfBookmarks = {
      pdfHash,
      bookmarks: bookmarks.sort((a, b) => a.page - b.page),
    }
    localStorage.setItem(`pdf-bookmarks-${pdfHash}`, JSON.stringify(data))
  } catch (error) {
    console.error("Error saving bookmarks:", error)
  }
}

export const addBookmark = (
  pdfHash: string,
  page: number,
  title?: string,
): Bookmark => {
  const existingBookmarks = getBookmarksForPdf(pdfHash)

  const existingBookmark = existingBookmarks.find((b) => b.page === page)
  if (existingBookmark) {
    return existingBookmark
  }

  const newBookmark: Bookmark = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    page,
    title: title || `Page ${page}`,
    createdAt: new Date().toISOString(),
  }

  const updatedBookmarks = [...existingBookmarks, newBookmark]
  saveBookmarksForPdf(pdfHash, updatedBookmarks)

  return newBookmark
}

export const removeBookmark = (pdfHash: string, bookmarkId: string): void => {
  const existingBookmarks = getBookmarksForPdf(pdfHash)
  const updatedBookmarks = existingBookmarks.filter((b) => b.id !== bookmarkId)
  saveBookmarksForPdf(pdfHash, updatedBookmarks)
}

export const isPageBookmarked = (pdfHash: string, page: number): boolean => {
  const bookmarks = getBookmarksForPdf(pdfHash)
  return bookmarks.some((b) => b.page === page)
}

export const getAllBookmarkedPdfs = (): string[] => {
  const keys = Object.keys(localStorage)
  return keys
    .filter((key) => key.startsWith("pdf-bookmarks-"))
    .map((key) => key.replace("pdf-bookmarks-", ""))
}
