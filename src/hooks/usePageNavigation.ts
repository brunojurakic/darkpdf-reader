import { useState, useCallback, useEffect } from "react"

interface UsePageNavigationResult {
  currentPage: number
  pageInput: string
  handlePageChange: (value: string) => void
  handlePageSubmit: () => void
  handlePageKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  setCurrentPage: (page: number) => void
  resetNavigation: () => void
}

export const usePageNavigation = (
  numPages: number,
): UsePageNavigationResult => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState("1")

  // Keep pageInput in sync with currentPage
  useEffect(() => {
    setPageInput(currentPage.toString())
  }, [currentPage])

  const handlePageChange = useCallback((value: string) => {
    setPageInput(value)
  }, [])

  const handlePageSubmit = useCallback(() => {
    const pageNum = parseInt(pageInput, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      setCurrentPage(pageNum)
    } else {
      setPageInput(currentPage.toString())
    }
  }, [pageInput, numPages, currentPage])

  const handlePageKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handlePageSubmit()
        e.currentTarget.blur()
      } else if (e.key === "Escape") {
        setPageInput(currentPage.toString())
        e.currentTarget.blur()
      }
    },
    [handlePageSubmit, currentPage],
  )

  const resetNavigation = useCallback(() => {
    setCurrentPage(1)
    setPageInput("1")
  }, [])

  return {
    currentPage,
    pageInput,
    handlePageChange,
    handlePageSubmit,
    handlePageKeyDown,
    setCurrentPage,
    resetNavigation,
  }
}
