// Sentry initialization for frontend error tracking

import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const ENVIRONMENT = import.meta.env.MODE || 'development'

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (ENVIRONMENT === 'development' && !import.meta.env.VITE_SENTRY_DEBUG) {
        return null
      }
      return event
    },
  })
}
