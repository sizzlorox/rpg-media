import { useState, useCallback, useRef } from 'react'
import { getResponsiveConfig, getCurrentViewportWidth } from '../utils/terminal-responsive'

export function useTerminal() {
  const [output, setOutput] = useState<string>('')
  // Initialize with responsive column count based on viewport
  const initialCols = typeof window !== 'undefined'
    ? getResponsiveConfig(getCurrentViewportWidth()).config.minCols
    : 80
  const terminalColsRef = useRef<number>(initialCols)

  const writeLine = useCallback((text: string) => {
    setOutput((prev) => prev + text + '\r\n')
  }, [])

  const setContent = useCallback((content: string) => {
    setOutput(content)
  }, [])

  const clear = useCallback(() => {
    setOutput('')
  }, [])

  const updateCols = useCallback((cols: number) => {
    terminalColsRef.current = cols
  }, [])

  return {
    output,
    writeLine,
    setContent,
    clear,
    terminalCols: terminalColsRef,
    updateCols,
  }
}
