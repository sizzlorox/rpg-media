import { useState, useCallback, useRef } from 'react'

export function useTerminal() {
  const [output, setOutput] = useState<string>('')
  const terminalColsRef = useRef<number>(80)

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
