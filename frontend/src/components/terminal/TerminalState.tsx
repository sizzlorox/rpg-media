/**
 * TerminalState Component
 * Centralized state management for terminal using useReducer
 */

import { useReducer, useCallback } from 'react'

// State shape
export interface TerminalState {
  commandHistory: string[]
  historyIndex: number
  currentCommand: string
  cursorPosition: number
  autocomplete: {
    suggestion: string
    visible: boolean
  }
  terminalCols: number
}

// Actions
export type TerminalAction =
  | { type: 'SET_COMMAND'; payload: string }
  | { type: 'SET_CURSOR_POSITION'; payload: number }
  | { type: 'ADD_TO_HISTORY'; payload: string }
  | { type: 'NAVIGATE_HISTORY'; payload: 'up' | 'down' }
  | { type: 'RESET_HISTORY_NAVIGATION' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_AUTOCOMPLETE'; payload: { suggestion: string; visible: boolean } }
  | { type: 'CLEAR_AUTOCOMPLETE' }
  | { type: 'SET_TERMINAL_COLS'; payload: number }
  | { type: 'RESET_STATE' }

// Reducer
function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case 'SET_COMMAND':
      return { ...state, currentCommand: action.payload, cursorPosition: action.payload.length }

    case 'SET_CURSOR_POSITION':
      return { ...state, cursorPosition: action.payload }

    case 'ADD_TO_HISTORY': {
      const newHistory = [...state.commandHistory, action.payload]
      // Keep only last 100 entries (circular buffer)
      const trimmedHistory = newHistory.length > 100
        ? newHistory.slice(newHistory.length - 100)
        : newHistory
      return {
        ...state,
        commandHistory: trimmedHistory,
        historyIndex: -1,
        currentCommand: '',
        cursorPosition: 0,
      }
    }

    case 'NAVIGATE_HISTORY': {
      const { commandHistory, historyIndex } = state
      if (commandHistory.length === 0) return state

      let newIndex = historyIndex
      if (action.payload === 'up') {
        newIndex = historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1)
      } else {
        newIndex = historyIndex === -1
          ? -1
          : Math.min(commandHistory.length - 1, historyIndex + 1)
      }

      const command = newIndex === -1 ? '' : commandHistory[newIndex]
      return {
        ...state,
        historyIndex: newIndex,
        currentCommand: command,
        cursorPosition: command.length,
      }
    }

    case 'RESET_HISTORY_NAVIGATION':
      return { ...state, historyIndex: -1 }

    case 'CLEAR_HISTORY':
      return { ...state, commandHistory: [], historyIndex: -1 }

    case 'SET_AUTOCOMPLETE':
      return { ...state, autocomplete: action.payload }

    case 'CLEAR_AUTOCOMPLETE':
      return { ...state, autocomplete: { suggestion: '', visible: false } }

    case 'SET_TERMINAL_COLS':
      return { ...state, terminalCols: action.payload }

    case 'RESET_STATE':
      return createInitialState()

    default:
      return state
  }
}

// Initial state factory
function createInitialState(cols: number = 80): TerminalState {
  return {
    commandHistory: [],
    historyIndex: -1,
    currentCommand: '',
    cursorPosition: 0,
    autocomplete: {
      suggestion: '',
      visible: false,
    },
    terminalCols: cols,
  }
}

// Hook
export function useTerminalState(initialCols: number = 80) {
  const [state, dispatch] = useReducer(terminalReducer, createInitialState(initialCols))

  const addToHistory = useCallback((command: string) => {
    dispatch({ type: 'ADD_TO_HISTORY', payload: command })
  }, [])

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    dispatch({ type: 'NAVIGATE_HISTORY', payload: direction })
  }, [])

  const setCommand = useCallback((command: string) => {
    dispatch({ type: 'SET_COMMAND', payload: command })
  }, [])

  const setCursorPosition = useCallback((position: number) => {
    dispatch({ type: 'SET_CURSOR_POSITION', payload: position })
  }, [])

  const setAutocomplete = useCallback((suggestion: string, visible: boolean) => {
    dispatch({ type: 'SET_AUTOCOMPLETE', payload: { suggestion, visible } })
  }, [])

  const clearAutocomplete = useCallback(() => {
    dispatch({ type: 'CLEAR_AUTOCOMPLETE' })
  }, [])

  const setTerminalCols = useCallback((cols: number) => {
    dispatch({ type: 'SET_TERMINAL_COLS', payload: cols })
  }, [])

  return {
    state,
    dispatch,
    addToHistory,
    navigateHistory,
    setCommand,
    setCursorPosition,
    setAutocomplete,
    clearAutocomplete,
    setTerminalCols,
  }
}
