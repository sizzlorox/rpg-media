// Terminal Renderer Component
// Feature: 001-custom-terminal-emulator

import React, { memo } from 'react'
import type { TerminalLine, TerminalCell } from '../../types/terminal'
import { TerminalImage } from './TerminalImage'

interface TerminalRendererProps {
  lines: TerminalLine[]
  lineHeight: number
  charWidth: number
  startLineNumber: number // Absolute line number of first visible line
  onImageLoadStart?: (urls: string[]) => void
  onImageLoadComplete?: (url: string, height?: number) => void
}

/**
 * Renders a range of terminal lines with character-level formatting
 */
export const TerminalRenderer: React.FC<TerminalRendererProps> = memo(({
  lines,
  lineHeight,
  charWidth,
  startLineNumber: _startLineNumber,
  onImageLoadStart,
  onImageLoadComplete
}) => {
  // Debug: Check for duplicate line numbers
  const lineNumbers = lines.map(l => l.metadata.lineNumber)
  const uniqueLineNumbers = new Set(lineNumbers)

  console.log('[TerminalRenderer] Rendering', lines.length, 'lines, line numbers:', lineNumbers.slice(0, 10), '...')

  if (uniqueLineNumbers.size !== lines.length) {
    console.error('[TerminalRenderer] DUPLICATE LINE NUMBERS DETECTED!', {
      totalLines: lines.length,
      uniqueLines: uniqueLineNumbers.size,
      lineNumbers: lineNumbers
    })
  }

  return (
    <div className="terminal-lines">
      {lines.map((line, _index) => (
        <TerminalLineComponent
          key={line.metadata.lineNumber}
          line={line}
          lineHeight={lineHeight}
          charWidth={charWidth}
          absoluteLineNumber={line.metadata.lineNumber}
          onImageLoadStart={onImageLoadStart}
          onImageLoadComplete={onImageLoadComplete}
        />
      ))}
    </div>
  )
})

TerminalRenderer.displayName = 'TerminalRenderer'

/**
 * Renders a single terminal line with formatted cells and optional inline image
 */
interface TerminalLineProps {
  line: TerminalLine
  lineHeight: number
  charWidth: number
  absoluteLineNumber: number
  onImageLoadStart?: (urls: string[]) => void
  onImageLoadComplete?: (url: string, height?: number) => void
}

const TerminalLineComponent: React.FC<TerminalLineProps> = memo(({
  line,
  lineHeight,
  onImageLoadStart,
  onImageLoadComplete
}) => {
  // If line has an image, don't render the [Image] placeholder text
  const shouldRenderCells = !line.image || line.cells.map(c => c.char).join('').trim() !== '[Image]'

  return (
    <div
      className="terminal-line"
      data-line={line.metadata.lineNumber}
      style={{ minHeight: `${lineHeight}px` }}
    >
      {shouldRenderCells && (
        <div className="terminal-line-cells">
          {line.cells.map((cell, col) => (
            <TerminalCellComponent key={col} cell={cell} />
          ))}
        </div>
      )}
      {line.image && (
        <TerminalImage
          url={line.image.url}
          alt={line.image.alt}
          maxWidth={line.image.maxWidth}
          maxHeight={line.image.maxHeight}
          onLoadStart={() => {
            // Notify parent that this image is starting to load (for scroll lock)
            if (onImageLoadStart && line.image) {
              onImageLoadStart([line.image.url])
            }
          }}
          onLoadComplete={(height?: number) => {
            // Notify parent that this specific image finished loading
            if (onImageLoadComplete && line.image) {
              onImageLoadComplete(line.image.url, height)
            }
          }}
        />
      )}
    </div>
  )
}, (prev, next) => {
  // Skip re-render only if line number AND all cell characters are identical
  if (prev.line.metadata.lineNumber !== next.line.metadata.lineNumber) {
    return false // Different line number, must re-render
  }

  if (prev.line.cells.length !== next.line.cells.length) {
    return false // Different cell count, must re-render
  }

  // Check if any cell characters changed (important for cursor movement)
  for (let i = 0; i < prev.line.cells.length; i++) {
    if (prev.line.cells[i].char !== next.line.cells[i].char) {
      return false // Cell content changed, must re-render
    }
  }

  return true // Everything identical, skip re-render
})

TerminalLineComponent.displayName = 'TerminalLineComponent'

/**
 * Renders a single character cell with formatting
 */
interface TerminalCellProps {
  cell: TerminalCell
}

const TerminalCellComponent: React.FC<TerminalCellProps> = memo(({ cell }) => {
  const style: React.CSSProperties = {}
  const classNames: string[] = ['terminal-cell']

  if (cell.fgColor) style.color = cell.fgColor
  if (cell.bgColor) style.backgroundColor = cell.bgColor
  if (cell.bold) style.fontWeight = 'bold'
  if (cell.italic) style.fontStyle = 'italic'
  if (cell.dim) style.opacity = 0.5

  const decorations: string[] = []
  if (cell.underline) decorations.push('underline')
  if (decorations.length > 0) {
    style.textDecoration = decorations.join(' ')
  }

  // Inverse swaps fg and bg (used for cursor)
  if (cell.inverse) {
    classNames.push('terminal-cursor')
    if (cell.fgColor && cell.bgColor) {
      const temp = style.color
      style.color = style.backgroundColor
      style.backgroundColor = temp
    }
  }

  // Hidden makes text invisible
  if (cell.hidden) {
    style.visibility = 'hidden'
  }

  // Handle newlines
  if (cell.char === '\n') {
    return <br />
  }

  return (
    <span className={classNames.join(' ')} style={style}>
      {cell.char}
    </span>
  )
}, (prev, next) =>
  prev.cell.char === next.cell.char &&
  prev.cell.fgColor === next.cell.fgColor &&
  prev.cell.bgColor === next.cell.bgColor &&
  prev.cell.bold === next.cell.bold &&
  prev.cell.italic === next.cell.italic &&
  prev.cell.underline === next.cell.underline &&
  prev.cell.dim === next.cell.dim &&
  prev.cell.inverse === next.cell.inverse &&
  prev.cell.hidden === next.cell.hidden
)

TerminalCellComponent.displayName = 'TerminalCellComponent'
