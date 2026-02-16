// Terminal Image Component with Load Handling
// Feature: 001-custom-terminal-emulator
// Purpose: Prevent scroll jumping by reserving space and coordinating image loads

import { useState, useEffect, memo, useRef } from 'react'

interface TerminalImageProps {
  url: string
  alt: string
  maxWidth: number
  maxHeight: number
  onLoadStart?: () => void
  onLoadComplete?: (height?: number) => void
}

/**
 * Image component that prevents layout shifts during loading
 *
 * Key behaviors:
 * 1. Pre-loads image to calculate actual dimensions
 * 2. Reserves space (minHeight) before image renders to prevent layout shift
 * 3. Provides load callbacks to coordinate with scroll lock
 * 4. Displays loading state while fetching
 * 5. Uses IntersectionObserver to only render images in/near viewport
 */
export const TerminalImage = memo(({
  url,
  alt,
  maxWidth,
  maxHeight,
  onLoadStart,
  onLoadComplete
}: TerminalImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [shouldLoad, setShouldLoad] = useState(false) // Triggers loading (300px buffer)
  const containerRef = useRef<HTMLDivElement>(null)

  // IntersectionObserver: Pre-load images approaching viewport (300px buffer)
  useEffect(() => {
    if (!containerRef.current) return

    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
        }
      },
      {
        rootMargin: '300px' // Start loading 300px before entering viewport
      }
    )

    loadObserver.observe(containerRef.current)
    return () => loadObserver.disconnect()
  }, [])

  // Pre-load image to get dimensions
  useEffect(() => {
    // Only load if shouldLoad is true (approaching viewport with 300px buffer)
    if (!shouldLoad) return

    onLoadStart?.()

    // Pre-load image to get dimensions
    const img = new Image()
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight
      let width = Math.min(img.naturalWidth, maxWidth)
      let height = width / aspectRatio

      if (height > maxHeight) {
        height = maxHeight
        width = height * aspectRatio
      }

      const finalHeight = Math.round(height)
      setDimensions({ width: Math.round(width), height: finalHeight })
      setIsLoaded(true)
      onLoadComplete?.(finalHeight) // Pass actual height back to parent
    }
    img.onerror = () => {
      setIsLoaded(true)
      onLoadComplete?.() // No height on error
    }
    img.src = url
  }, [url, maxWidth, maxHeight, shouldLoad, onLoadStart, onLoadComplete])

  return (
    <div
      ref={containerRef}
      className="terminal-line-image"
      style={{
        // Reserve maxHeight from the start, stay stable until loaded (only ONE reflow)
        minHeight: isLoaded ? `${dimensions.height}px` : `${maxHeight}px`
      }}
    >
      {shouldLoad && !isLoaded && (
        <div style={{ color: '#00ff00', fontSize: '12px' }}>Loading image...</div>
      )}
      {/* Once loaded, always keep in DOM to prevent scroll jumps from height changes */}
      {isLoaded && dimensions.height > 0 && (
        <img
          src={url}
          alt={alt}
          className="terminal-inline-image"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            display: 'block'
          }}
        />
      )}
    </div>
  )
})

TerminalImage.displayName = 'TerminalImage'
