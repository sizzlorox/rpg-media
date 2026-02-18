import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TerminalErrorBoundary } from './components/terminal/TerminalErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import { initSentry } from './services/sentry'

// Initialize Sentry for error tracking
initSentry()

createRoot(document.getElementById('root')!).render(
  <TerminalErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </TerminalErrorBoundary>,
)
