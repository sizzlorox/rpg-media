// Re-export useAuth from AuthContext for backward compatibility
// This allows existing imports to continue working without changes
//
// Migration complete: useAuth now uses shared React Context instead of isolated useState
// This fixes the black screen bug where multiple component instances had separate auth state

export { useAuth } from '../contexts/AuthContext'
