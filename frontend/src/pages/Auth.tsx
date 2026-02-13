// Auth page with terminal interface for login and register

import { useState, useCallback } from 'react'
import { Terminal } from '../components/Terminal'
import { useAuth } from '../hooks/useAuth'
import { useTerminalCommands } from '../hooks/useTerminalCommands'
import { green, yellow, red } from '../utils/ansi-colors'
import '../styles/terminal.css'

export function AuthPage() {
  const { login, register } = useAuth()
  const [terminalOutput, setTerminalOutput] = useState<string>('')

  const writeLine = useCallback((text: string) => {
    setTerminalOutput((prev) => prev + text + '\r\n')
  }, [])

  const handleRegister = useCallback(
    async (username: string, password: string) => {
      try {
        const user = await register(username, password)
        writeLine(green(`✓ Account created successfully!`))
        writeLine(green(`Welcome, ${user.username}!`))
        writeLine(yellow(`Level: ${user.level} | XP: ${user.total_xp}`))
        writeLine('')
        writeLine('You can now:')
        writeLine('  /post <content>  - Create your first post')
        writeLine('  /feed            - View your home feed')
        writeLine('  /profile         - View your character sheet')
      } catch (error) {
        writeLine(red(`✗ Registration failed: ${(error as Error).message}`))
      }
    },
    [register, writeLine]
  )

  const handleLogin = useCallback(
    async (username: string, password: string) => {
      try {
        const user = await login(username, password)
        writeLine(green(`✓ Welcome back, ${user.username}!`))
        writeLine(yellow(`Level: ${user.level} | XP: ${user.total_xp}/${user.xp_for_next_level}`))
        writeLine('')
        writeLine('Type /help to see available commands')
      } catch (error) {
        writeLine(red(`✗ Login failed: ${(error as Error).message}`))
      }
    },
    [login, writeLine]
  )

  const { executeCommand } = useTerminalCommands({
    onRegister: handleRegister,
    onLogin: handleLogin,
    onHelp: () => {
      writeLine(yellow('Available commands:'))
      writeLine('  /register <username> <password> - Create a new account')
      writeLine('  /login <username> <password>    - Login to your account')
      writeLine('  /help                           - Show this help')
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
    <div className="auth-page">
      <Terminal
        onCommand={handleCommand}
        initialContent={terminalOutput}
      />
    </div>
  )
}
