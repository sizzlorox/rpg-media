// Custom Terminal Wrapper with xterm.js-compatible API
// Feature: 001-custom-terminal-emulator
// Provides a complete drop-in replacement for xterm.js

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useTerminalScrollBuffer } from './TerminalScrollBuffer'
import { TerminalRenderer } from './TerminalRenderer'
import { parseImageMarkers, getResponsiveImageDimensions } from './TerminalImageManager'
import { ANSIParser } from '../../utils/ansi-parser'
import { createDefaultLine } from '../../types/terminal'
import type { TerminalLine } from '../../types/terminal'
import { getResponsiveConfig } from '../../utils/terminal-responsive'

/**
 * Mock Terminal API that mimics xterm.js interface exactly
 */
class CustomTerminalAPI {
  private scrollBuffer: any
  private ansiParser: ANSIParser
  private containerRef: React.RefObject<HTMLDivElement | null>
  private dataHandlers: ((data: string) => void)[] = []
  public cols: number
  public rows: number
  private breakpoint: 'mobile' | 'tablet' | 'desktop'
  private currentLineCells: any[] = [] // Buffer for the current line being edited
  private onImageLoadStart?: (urls: string[]) => void
  public shouldAutoScrollAfterRender = false

  constructor(
    scrollBuffer: any,
    ansiParser: ANSIParser,
    containerRef: React.RefObject<HTMLDivElement | null>,
    cols: number,
    rows: number,
    breakpoint: 'mobile' | 'tablet' | 'desktop',
    onImageLoadStart?: (urls: string[]) => void,
    _onImageLoadComplete?: (url: string) => void // Passed through props, not used in API
  ) {
    this.scrollBuffer = scrollBuffer
    this.ansiParser = ansiParser
    this.containerRef = containerRef
    this.cols = cols
    this.rows = rows
    this.breakpoint = breakpoint
    this.onImageLoadStart = onImageLoadStart
    // onImageLoadComplete is passed through to renderer, not stored in API
  }

  write(text: string) {
    // Check if user is at bottom before adding content
    const shouldAutoScroll = this.isAtBottom()

    // Parse image markers
    const { text: cleanText, images } = parseImageMarkers(text)

    // Parse ANSI codes
    const cells = this.ansiParser.parse(cleanText)

    // Check if this is a content block (has newlines) or interactive input
    const hasNewline = cells.some(cell => cell.char === '\n' || cell.char === '\r')

    if (hasNewline) {
      // CONTENT BLOCK MODE: Write complete lines with newlines
      // First, commit any pending interactive input
      if (this.currentLineCells.length > 0) {
        this.scrollBuffer.popLast()
        const lineNumber = this.scrollBuffer.getTotalLines()
        const line = createDefaultLine(lineNumber, this.cols)
        line.cells = this.currentLineCells
        this.scrollBuffer.append(line)
        this.currentLineCells = []
      }

      // Split into lines
      const lines: TerminalLine[] = []
      let currentLine: typeof cells = []
      let lineNumber = this.scrollBuffer.getTotalLines()

      for (const cell of cells) {
        if (cell.char === '\n' || cell.char === '\r') {
          if (cell.char === '\r' && currentLine.length === 0) {
            continue
          }
          const line = createDefaultLine(lineNumber++, this.cols)
          line.cells = currentLine.length > 0 ? currentLine : line.cells
          lines.push(line)
          currentLine = []
        } else {
          currentLine.push(cell)
        }
      }

      // Add remaining cells if any
      if (currentLine.length > 0 || lines.length === 0) {
        const line = createDefaultLine(lineNumber++, this.cols)
        line.cells = currentLine
        lines.push(line)
      }

      // Append to buffer
      if (lines.length > 0) {
        this.scrollBuffer.appendMultiple(lines)
      }
    } else {
      // INTERACTIVE INPUT MODE: Accumulate characters on current line

      // Remove the incomplete line if it exists
      if (this.currentLineCells.length > 0) {
        this.scrollBuffer.popLast()
      }

      // Add new cells to current line buffer
      for (const cell of cells) {
        this.currentLineCells.push(cell)
      }


      // Re-add the updated incomplete line
      const lineNumber = this.scrollBuffer.getTotalLines()
      const line = createDefaultLine(lineNumber, this.cols)
      line.cells = [...this.currentLineCells]

      this.scrollBuffer.append(line)
    }

    // Attach images to lines containing [Image] markers
    if (images.length > 0) {
      const imageDimensions = getResponsiveImageDimensions(this.breakpoint)
      const totalLines = this.scrollBuffer.getTotalLines()

      // Notify parent about loading images
      if (this.onImageLoadStart) {
        this.onImageLoadStart(images.map(img => img.url))
      }

      // Search backwards through recently added lines to find [Image] markers
      let imageIndex = 0
      for (let i = totalLines - 1; i >= 0 && imageIndex < images.length; i--) {
        const line = this.scrollBuffer.getLine(i)
        if (line) {
          // Check if this line contains the [Image] placeholder text
          const lineText = line.cells.map((cell: any) => cell.char).join('')
          if (lineText.includes('[Image]')) {
            line.image = {
              ...images[imageIndex],
              maxWidth: imageDimensions.maxWidth,
              maxHeight: imageDimensions.maxHeight
            }
            imageIndex++
          }
        }
      }
    }

    // Mark that we should auto-scroll after React re-renders
    if (shouldAutoScroll) {
      this.shouldAutoScrollAfterRender = true
    }
  }

  writeln(text: string) {
    this.write(text + '\r\n')
  }

  private isAtBottom(): boolean {
    if (!this.containerRef.current) return true

    const container = this.containerRef.current
    const threshold = 50 // pixels - consider "at bottom" if within 50px
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight

    return distanceFromBottom <= threshold
  }

  clear() {
    this.scrollBuffer.clear()
    this.currentLineCells = [] // Clear the input line buffer too
  }

  reset() {
    this.scrollBuffer.clear()
    this.currentLineCells = [] // Clear the input line buffer too
  }

  focus() {
    this.containerRef.current?.focus()
  }

  blur() {
    this.containerRef.current?.blur()
  }

  scrollToBottom() {
    if (!this.containerRef.current) return

    // Use setTimeout to ensure React has fully re-rendered with new content
    setTimeout(() => {
      if (this.containerRef.current) {
        this.containerRef.current.scrollTop = this.containerRef.current.scrollHeight
      }
    }, 0)
  }

  onData(handler: (data: string) => void): { dispose: () => void } {
    this.dataHandlers.push(handler)
    return {
      dispose: () => {
        const index = this.dataHandlers.indexOf(handler)
        if (index > -1) {
          this.dataHandlers.splice(index, 1)
        }
      }
    }
  }

  emitData(data: string) {
    this.dataHandlers.forEach(handler => handler(data))
  }

  // Replace the current input line (for terminal input updates)
  replaceInputLine(text: string) {
    // Remove the current incomplete line if it exists
    if (this.currentLineCells.length > 0) {
      this.scrollBuffer.popLast()
    }

    // Clear and rebuild currentLineCells
    this.currentLineCells = []

    // Parse the new text
    const cells = this.ansiParser.parse(text)
    for (const cell of cells) {
      this.currentLineCells.push(cell)
    }

    // Append the new line
    const lineNumber = this.scrollBuffer.getTotalLines()
    const line = createDefaultLine(lineNumber, this.cols)
    line.cells = [...this.currentLineCells]
    this.scrollBuffer.append(line)

    // Don't auto-scroll - let user control scroll position
  }
}

/**
 * Hook that provides xterm.js-compatible API using CustomTerminalCore
 */
interface UseCustomTerminalProps {
  config: {
    rows?: number
    cols?: number
    fontSize?: number
    fontFamily?: string
    theme?: any
    cursorBlink?: boolean
  }
  onReady?: (terminal: CustomTerminalAPI) => void
}

export function useCustomTerminal(props: UseCustomTerminalProps) {
  const { config, onReady } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const rendererContainerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<CustomTerminalAPI | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Get responsive config
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024
  const responsiveConfig = getResponsiveConfig(width)
  const breakpoint: 'mobile' | 'tablet' | 'desktop' =
    width <= 640 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop'

  const rows = config.rows || responsiveConfig.config.minRows
  const cols = config.cols || responsiveConfig.config.minCols

  // Terminal state
  const scrollBuffer = useTerminalScrollBuffer(50000) // Increased from 10k to 50k to preserve welcome message
  const [ansiParser] = useState(() => new ANSIParser())
  const [viewport, setViewport] = useState({
    scrollY: 0,
    lineHeight: responsiveConfig.config.fontSize * 1.2,
    charWidth: responsiveConfig.config.fontSize * 0.6
  })

  // Scroll lock during image loads to prevent jump
  const scrollLockRef = useRef(false)
  const loadingImagesRef = useRef<Set<string>>(new Set())

  // Track actual rendered image heights (url -> height in pixels)
  const [actualImageHeights, setActualImageHeights] = useState<Map<string, number>>(new Map())

  // Force re-render when buffer changes
  const bufferRevision = scrollBuffer.revision

  // Image load callbacks
  const handleImageLoadStart = useCallback((urls: string[]) => {
    urls.forEach(url => loadingImagesRef.current.add(url))
    scrollLockRef.current = true
  }, [])

  const handleImageLoadComplete = useCallback((url: string, height?: number) => {
    loadingImagesRef.current.delete(url)

    // Store actual rendered height if provided
    if (height) {
      setActualImageHeights(prev => {
        const newMap = new Map(prev)
        newMap.set(url, height)
        return newMap
      })
    }

    // Unlock scroll when all images finish loading
    if (loadingImagesRef.current.size === 0) {
      scrollLockRef.current = false
    }
  }, [])

  // Initialize terminal API
  useEffect(() => {
    if (terminalRef.current) return

    const api = new CustomTerminalAPI(
      scrollBuffer,
      ansiParser,
      containerRef,
      cols,
      rows,
      breakpoint,
      handleImageLoadStart,
      handleImageLoadComplete
    )

    terminalRef.current = api
    setIsReady(true)

    // Auto-focus the terminal
    setTimeout(() => {
      containerRef.current?.focus()
    }, 100)

    if (onReady) {
      onReady(api)
    }
  }, [scrollBuffer, ansiParser, cols, rows, breakpoint, onReady, handleImageLoadStart, handleImageLoadComplete])

  // Setup keyboard event handling (separate effect that always runs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      // Handle special keys
      let data = ''

      if (e.key === 'Enter') {
        data = '\r'
      } else if (e.key === 'Backspace') {
        data = '\x7F'
      } else if (e.key === 'Tab') {
        data = '\t'
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        data = '\x1B[A'
        e.preventDefault()
      } else if (e.key === 'ArrowDown') {
        data = '\x1B[B'
        e.preventDefault()
      } else if (e.key === 'ArrowRight') {
        data = '\x1B[C'
        e.preventDefault()
      } else if (e.key === 'ArrowLeft') {
        data = '\x1B[D'
        e.preventDefault()
      } else if (e.key === 'Delete') {
        data = '\x1B[3~'
      } else if (e.key === 'Home') {
        data = '\x1B[H'
      } else if (e.key === 'End') {
        data = '\x1B[F'
      } else if (e.ctrlKey && e.key === 'c') {
        data = '\x03'
        e.preventDefault()
      } else if (e.ctrlKey && e.key === 'l') {
        data = '\x0C'
        e.preventDefault()
      } else if (e.ctrlKey && e.key === 'u') {
        data = '\x15'
        e.preventDefault()
      } else if (e.ctrlKey && e.key === 'a') {
        data = '\x01'
        e.preventDefault()
      } else if (e.ctrlKey && e.key === 'e') {
        data = '\x05'
        e.preventDefault()
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        data = e.key
      }

      if (data && terminalRef.current) {
        terminalRef.current.emitData(data)
      }
    }

    containerRef.current?.addEventListener('keydown', handleKeyDown)

    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown)
    }
  }, []) // Empty deps - only set up once and cleanup on unmount

  // Auto-scroll after buffer updates if needed
  useEffect(() => {
    if (terminalRef.current?.shouldAutoScrollAfterRender) {
      terminalRef.current.shouldAutoScrollAfterRender = false
      terminalRef.current.scrollToBottom()
    }
  }, [bufferRevision])

  // Handle scroll with requestAnimationFrame batching for 60fps
  const scrollRAFRef = useRef<number | null>(null)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // SKIP SCROLL UPDATES IF IMAGES ARE LOADING
    // This prevents the feedback loop that causes scroll jumping:
    // 1. Image loads -> browser reflows -> scrollTop changes naturally
    // 2. Without this check: scroll event fires -> React re-renders -> scroll jumps
    // 3. With this check: scroll updates are ignored during image loads
    if (scrollLockRef.current) {
      return
    }

    const target = e.currentTarget
    const scrollY = target.scrollTop

    // Cancel previous animation frame if pending
    if (scrollRAFRef.current !== null) {
      cancelAnimationFrame(scrollRAFRef.current)
    }

    // Batch scroll updates using requestAnimationFrame for 60fps
    scrollRAFRef.current = requestAnimationFrame(() => {
      setViewport(prev => ({
        ...prev,
        scrollY
      }))
      scrollRAFRef.current = null
    })
  }, [])

  // Build height map: track actual line heights (including images)
  const lineHeights = useMemo(() => {
    const heights = new Map<number, number>()
    const totalLinesCount = scrollBuffer.getTotalLines()
    const oldestLineNum = scrollBuffer.getOldestLineNumber()


    for (let i = 0; i < totalLinesCount; i++) {
      const lineNumber = oldestLineNum + i
      const line = scrollBuffer.getLine(lineNumber)

      if (line?.image) {
        // Try to use actual rendered height if available, otherwise use maxHeight
        const actualHeight = actualImageHeights.get(line.image.url)
        const imageHeight = actualHeight || line.image.maxHeight
        const totalHeight = imageHeight + 20 // +20 for margin (10px top + 10px bottom)
        heights.set(lineNumber, totalHeight)
      } else {
        // Text lines use standard lineHeight
        heights.set(lineNumber, viewport.lineHeight)
      }
    }

    return heights
  }, [bufferRevision, scrollBuffer, viewport.lineHeight, actualImageHeights])

  // Calculate startLine by accumulating heights until we reach scrollY
  const calculateStartLine = useCallback(() => {
    const totalLinesCount = scrollBuffer.getTotalLines()
    const oldestLineNum = scrollBuffer.getOldestLineNumber()


    // If no lines, return 0
    if (totalLinesCount === 0) {
      console.warn('[calculateStartLine] No lines in buffer, returning 0')
      return 0
    }

    let accumulatedHeight = 0

    for (let i = 0; i < totalLinesCount; i++) {
      const lineNumber = oldestLineNum + i
      const height = lineHeights.get(lineNumber) || viewport.lineHeight

      if (accumulatedHeight + height > viewport.scrollY) {
        return lineNumber
      }

      accumulatedHeight += height
    }

    const result = oldestLineNum + totalLinesCount - 1
    return result
  }, [viewport.scrollY, lineHeights, scrollBuffer, viewport.lineHeight])

  // Calculate endLine by continuing to accumulate until viewport is filled
  const calculateEndLine = useCallback((startLineNum: number) => {
    const viewportHeight = containerRef.current?.clientHeight || window.innerHeight
    const bufferLines = 50 // Extra lines to render
    const totalLinesCount = scrollBuffer.getTotalLines()
    const oldestLineNum = scrollBuffer.getOldestLineNumber()
    const lastValidLine = oldestLineNum + totalLinesCount - 1

    let accumulatedHeight = 0
    let currentLine = startLineNum

    while (accumulatedHeight < viewportHeight + (bufferLines * viewport.lineHeight)) {
      // Stop if we've reached the last line
      if (currentLine > lastValidLine) {
        break
      }

      const height = lineHeights.get(currentLine) || viewport.lineHeight
      accumulatedHeight += height
      currentLine++
    }

    // Return the last line we processed (getVisibleRange is inclusive)
    return Math.min(currentLine - 1, lastValidLine)
  }, [lineHeights, scrollBuffer, viewport.lineHeight])

  // Calculate visible lines using height-aware calculations
  const startLine = calculateStartLine()
  const endLine = calculateEndLine(startLine)
  const visibleLines = scrollBuffer.getVisibleRange(startLine, endLine)

  // Calculate total content height by summing all actual line heights
  const totalContentHeight = useMemo(() => {
    let totalHeight = 0
    for (const height of lineHeights.values()) {
      totalHeight += height
    }
    return totalHeight
  }, [lineHeights])

  // Calculate absolute top position for rendering (sum heights up to startLine)
  const topPosition = useMemo(() => {
    const oldestLineNum = scrollBuffer.getOldestLineNumber()
    let position = 0

    for (let lineNumber = oldestLineNum; lineNumber < startLine; lineNumber++) {
      position += lineHeights.get(lineNumber) || viewport.lineHeight
    }

    return position
  }, [startLine, lineHeights, scrollBuffer, viewport.lineHeight])

  // Fit function (no-op for custom terminal)
  const fit = useCallback(() => {
    // Custom terminal auto-fits, no action needed
  }, [])

  const write = useCallback((text: string) => {
    terminalRef.current?.write(text)
  }, [])

  const focus = useCallback(() => {
    containerRef.current?.focus()
  }, [])

  const clear = useCallback(() => {
    terminalRef.current?.clear()
  }, [])

  // Render component
  const renderTerminal = () => {
    return (
      <div
        ref={containerRef}
        className="custom-terminal-wrapper"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
          backgroundColor: '#000000',
          color: '#00ff00',
          fontFamily: 'IBM Plex Mono, Courier New, monospace',
          fontSize: `${responsiveConfig.config.fontSize}px`,
          lineHeight: `${viewport.lineHeight}px`,
          padding: responsiveConfig.config.padding,
          outline: 'none',
          cursor: 'text'
        }}
        tabIndex={0}
        onScroll={handleScroll}
        onClick={() => containerRef.current?.focus()}
      >
      <div
        ref={rendererContainerRef}
        style={{
          height: `${totalContentHeight}px`,
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: `${topPosition}px`,
            left: 0,
            right: 0
          }}
        >
          <TerminalRenderer
            lines={visibleLines}
            lineHeight={viewport.lineHeight}
            charWidth={viewport.charWidth}
            startLineNumber={startLine}
            onImageLoadStart={handleImageLoadStart}
            onImageLoadComplete={handleImageLoadComplete}
          />
        </div>
      </div>
    </div>
    )
  }

  return {
    terminalRef,
    containerRef,
    fitAddonRef: { current: null }, // Mock for compatibility
    fit,
    write,
    focus,
    clear,
    isReady,
    renderTerminal
  }
}
