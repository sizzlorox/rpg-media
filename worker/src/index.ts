// Cloudflare Worker Entry Point
// RPG Social Media Platform - Hono API with Sentry Error Tracking

import * as Sentry from '@sentry/cloudflare'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HonoEnv } from './lib/types'
import { errorHandler } from './middleware/error-handler'
import { analyticsLogger } from './middleware/analytics'
import authRoutes from './routes/auth'
import postsRoutes from './routes/posts'
import usersRoutes from './routes/users'
import feedRoutes from './routes/feed'
import interactionsRoutes from './routes/interactions'
import xpRoutes from './routes/xp'
import levelsRoutes from './routes/levels'
import mediaRoutes from './routes/media'

const app = new Hono<HonoEnv>()

// Middleware - CORS with credentials support
app.use('*', cors({
  origin: (origin) => {
    // Allow production frontend and localhost for development
    const allowedOrigins = [
      'https://rpg.apogeeforge.com',
      'http://localhost:5173',
      'http://localhost:3000',
    ]
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
}))
app.use('*', analyticsLogger)

// Routes
app.route('/api/auth', authRoutes)
app.route('/api/posts', postsRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/feed', feedRoutes)
app.route('/api', interactionsRoutes)
app.route('/api/xp', xpRoutes)
app.route('/api/levels', levelsRoutes)
app.route('/api/media', mediaRoutes)
app.route('/media', mediaRoutes)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

// Error handler (must be last)
app.onError(errorHandler)

// Export with Sentry wrapper
export default {
  async fetch(request: Request, env: HonoEnv['Bindings'], ctx: ExecutionContext) {
    return Sentry.withSentry(
      {
        dsn: env.SENTRY_DSN,
        environment: env.ENVIRONMENT || 'production',
        tracesSampleRate: 0.1,
        beforeSend(event) {
          // Scrub sensitive data from error events
          if (event.request?.headers) {
            delete event.request.headers['Authorization']
            delete event.request.headers['Cookie']
          }
          return event
        },
      },
      () => app.fetch(request, env, ctx)
    )
  },
}
