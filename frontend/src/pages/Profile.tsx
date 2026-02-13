// Profile page showing ASCII character sheet

import { useState, useCallback, useEffect } from 'react'
import { Terminal } from '../components/Terminal'
import { renderASCIICharacterSheet } from '../components/ASCIICharacterSheet'
import { useTerminalCommands } from '../hooks/useTerminalCommands'
import { apiClient } from '../services/api-client'
import { yellow, red } from '../utils/ansi-colors'
import type { UserProfile } from '../../../shared/types'
import '../styles/terminal.css'

interface ProfilePageProps {
  username?: string
}

export function ProfilePage({ username }: ProfilePageProps) {
  const [terminalOutput, setTerminalOutput] = useState<string>('')

  const writeLine = useCallback((text: string) => {
    setTerminalOutput((prev) => prev + text + '\r\n')
  }, [])

  // Load profile
  useEffect(() => {
    loadProfile(username)
  }, [username])

  const loadProfile = async (user?: string) => {
    try {
      const endpoint = user ? `/users/${user}` : '/auth/me'
      const result = await apiClient.get<UserProfile>(endpoint)

      // Display character sheet
      const sheet = renderASCIICharacterSheet(result)
      setTerminalOutput(sheet + '\r\n')
    } catch (error) {
      writeLine(red(`✗ Failed to load profile: ${(error as Error).message}`))
    }
  }

  const { executeCommand } = useTerminalCommands({
    onProfile: async (targetUsername) => {
      await loadProfile(targetUsername)
    },
    onHelp: () => {
      writeLine(yellow('Available commands:'))
      writeLine('  /profile [username] - View character sheet')
      writeLine('  /help               - Show this help')
    },
    onClear: () => {
      setTerminalOutput('')
    },
  })

  const handleCommand = useCallback(
    async (command: string) => {
      writeLine(`> ${command}`)
      const result = await executeCommand(command)
      if (result) {
        writeLine(result)
      }
    },
    [executeCommand, writeLine]
  )

  return (
    <div className="profile-page">
      <Terminal onCommand={handleCommand} initialContent={terminalOutput} />
    </div>
  )
}
