import { useState, useCallback } from "react"

interface UsePdfControlsResult {
  scale: number
  rotation: number
  customZoomInput: string
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleRotate: () => void
  handleCustomZoomChange: (value: string) => void
  handleCustomZoomSubmit: () => void
  handleCustomZoomKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  setScale: (scale: number) => void
  setRotation: (rotation: number) => void
  resetControls: () => void
}

export const usePdfControls = (): UsePdfControlsResult => {
  const [scale, setScale] = useState(2)
  const [rotation, setRotation] = useState(0)
  const [customZoomInput, setCustomZoomInput] = useState("200%")

  const updateCustomZoomInput = useCallback((newScale: number) => {
    setCustomZoomInput(Math.round(newScale * 100).toString() + "%")
  }, [])

  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(scale + 0.5, 4)
    setScale(newScale)
    updateCustomZoomInput(newScale)
  }, [scale, updateCustomZoomInput])

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(scale - 0.5, 0.75)
    setScale(newScale)
    updateCustomZoomInput(newScale)
  }, [scale, updateCustomZoomInput])

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  const handleCustomZoomChange = useCallback((value: string) => {
    let newValue = value

    newValue = newValue.replace(/%/g, "")
    newValue = newValue.replace(/[^\d]/g, "")
    newValue = newValue + "%"

    setCustomZoomInput(newValue)
  }, [])

  const handleCustomZoomSubmit = useCallback(() => {
    const numericValue = customZoomInput.replace("%", "")
    const numValue = parseInt(numericValue, 10)

    if (!isNaN(numValue) && numValue >= 75 && numValue <= 400) {
      const newScale = numValue / 100
      setScale(newScale)
      updateCustomZoomInput(newScale)
    } else {
      updateCustomZoomInput(scale)
    }
  }, [customZoomInput, scale, updateCustomZoomInput])

  const handleCustomZoomKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleCustomZoomSubmit()
        e.currentTarget.blur()
      } else if (e.key === "Escape") {
        updateCustomZoomInput(scale)
        e.currentTarget.blur()
      }
    },
    [handleCustomZoomSubmit, scale, updateCustomZoomInput],
  )

  const setScaleWithUpdate = useCallback(
    (newScale: number) => {
      setScale(newScale)
      updateCustomZoomInput(newScale)
    },
    [updateCustomZoomInput],
  )

  const resetControls = useCallback(() => {
    setScale(2)
    setRotation(0)
    setCustomZoomInput("200%")
  }, [])

  return {
    scale,
    rotation,
    customZoomInput,
    handleZoomIn,
    handleZoomOut,
    handleRotate,
    handleCustomZoomChange,
    handleCustomZoomSubmit,
    handleCustomZoomKeyDown,
    setScale: setScaleWithUpdate,
    setRotation,
    resetControls,
  }
}
