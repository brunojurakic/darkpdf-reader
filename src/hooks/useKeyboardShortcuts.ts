import { useEffect, useCallback } from "react"

interface UseKeyboardShortcutsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onCopyAllText: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onScrollUp: () => void
  onScrollDown: () => void
}

export const useKeyboardShortcuts = ({
  onZoomIn,
  onZoomOut,
  onCopyAllText,
  onPreviousPage,
  onNextPage,
  onScrollUp,
  onScrollDown,
}: UseKeyboardShortcutsProps) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable

      if (e.ctrlKey || e.metaKey) {
        if (!isEditable && e.key.toLowerCase() === "a") {
          e.preventDefault()
          onCopyAllText()
          return
        }
        switch (e.key) {
          case "=":
          case "+":
            e.preventDefault()
            onZoomIn()
            break
          case "-":
            e.preventDefault()
            onZoomOut()
            break
          case "0":
            e.preventDefault()
            break
        }
      } else {
        switch (e.key) {
          case "ArrowLeft":
            e.preventDefault()
            onPreviousPage()
            break
          case "ArrowRight":
            e.preventDefault()
            onNextPage()
            break
          case "ArrowUp":
            e.preventDefault()
            onScrollUp()
            break
          case "ArrowDown":
            e.preventDefault()
            onScrollDown()
            break
        }
      }
    },
    [
      onZoomIn,
      onZoomOut,
      onCopyAllText,
      onPreviousPage,
      onNextPage,
      onScrollUp,
      onScrollDown,
    ],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
