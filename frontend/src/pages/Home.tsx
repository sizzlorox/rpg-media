// Home page with terminal feed display

import { Terminal } from '../components/Terminal'
import { useHomeLogic } from '../hooks/useHomeLogic'
import '../styles/terminal.css'

export function HomePage() {
  const { terminalOutput, handleCommand } = useHomeLogic()

  return (
    <div className="home-page">
      <Terminal onCommand={handleCommand} initialContent={terminalOutput} skipWelcome={true} />
    </div>
  )
}
