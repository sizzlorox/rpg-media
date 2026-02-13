// Terminal command input prompt component

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { green } from '../utils/ansi-colors'

interface TerminalPromptProps {
  onSubmit: (command: string) => void
  placeholder?: string
  maxLength?: number
}

export function TerminalPrompt({ onSubmit, placeholder = '', maxLength }: TerminalPromptProps) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      onSubmit(input.trim())
      setInput('')
    }
  }

  return (
    <div className="terminal-prompt" style={{ display: 'flex', alignItems: 'center', fontFamily: 'monospace' }}>
      <span style={{ color: '#00ff00', marginRight: '8px' }}>&gt;</span>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          color: '#00ff00',
          fontFamily: 'IBM Plex Mono, Courier New, monospace',
          fontSize: '14px',
          outline: 'none',
        }}
      />
      {maxLength && (
        <span style={{ color: '#ffff00', marginLeft: '8px', fontSize: '12px' }}>
          {input.length}/{maxLength}
        </span>
      )}
    </div>
  )
}

// Helper to render prompt in terminal
export function renderPrompt(text: string = ''): string {
  return `${green('>')} ${text}`
}
