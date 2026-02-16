// Hidden file input component for terminal-style file selection
import { useRef, useImperativeHandle, forwardRef } from 'react'

interface TerminalFilePickerProps {
  onFileSelected: (file: File | undefined) => void
  accept?: string
}

export interface TerminalFilePickerRef {
  openPicker: () => void
}

/**
 * Hidden file input component that maintains terminal aesthetic
 * Triggered programmatically from terminal commands
 */
export const TerminalFilePicker = forwardRef<TerminalFilePickerRef, TerminalFilePickerProps>(
  ({ onFileSelected, accept = 'image/jpeg,image/png,image/gif,image/webp' }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      openPicker: () => {
        inputRef.current?.click()
      }
    }))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      onFileSelected(file)

      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }

    return (
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    )
  }
)

TerminalFilePicker.displayName = 'TerminalFilePicker'
