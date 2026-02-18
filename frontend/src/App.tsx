import { useEffect } from 'react'
import { HomePage } from './pages/Home'
import { Landing } from './pages/Landing'
import { useAuth } from './hooks/useAuth'
import './styles/terminal.css'

function App() {
  const { isAuthenticated, isLoading, verifyEmail } = useAuth()

  // Handle email verification and password reset links on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verifyToken = params.get('token')
    const path = window.location.pathname

    if (path === '/verify-email' && verifyToken) {
      verifyEmail(verifyToken)
        .then(() => {
          // Clean URL after verification
          window.history.replaceState({}, '', '/')
        })
        .catch(() => {
          window.history.replaceState({}, '', '/')
        })
    }
  }, [verifyEmail])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="terminal-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'IBM Plex Mono, monospace',
        color: '#00ff00',
        backgroundColor: '#000000'
      }}>
        Loading...
      </div>
    )
  }

  // Show Landing page for unauthenticated users, Home for authenticated users
  return isAuthenticated ? <HomePage /> : <Landing />
}

export default App
