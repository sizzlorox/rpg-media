// Cloudflare Worker Entry Point
// Social Forge Platform - Hono API

import { Hono } from 'hono'
import { HonoEnv } from './lib/types'
import { errorHandler } from './middleware/error-handler'
import { analyticsLogger } from './middleware/analytics'
import { jsonBodyParser } from './middleware/body-parser'
import { securityHeaders } from './middleware/security-headers'
import { requestIdMiddleware } from './middleware/request-id'
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
app.use('*', async (c, next) => {
  const isDevelopment = c.env.ENVIRONMENT !== 'production'

  if (isDevelopment) {
    // Development: Allow all origins
    c.header('Access-Control-Allow-Origin', '*')
  } else {
    // Production: Only allow specific domain
    const origin = c.req.header('Origin')
    if (origin === 'https://rpg.apogeeforge.com') {
      c.header('Access-Control-Allow-Origin', origin)
    }
  }

  c.header('Access-Control-Allow-Credentials', 'true')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id')
  c.header('Access-Control-Max-Age', '600')
  c.header('Vary', 'Origin')

  await next()
})
app.use('*', requestIdMiddleware)
app.use('*', securityHeaders)
app.use('*', analyticsLogger)
app.use('*', jsonBodyParser)

// Routes
app.route('/api/auth', authRoutes)
app.route('/api/posts', postsRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/feed', feedRoutes)
app.route('/api', interactionsRoutes)
app.route('/api/xp', xpRoutes)
app.route('/api/levels', levelsRoutes)
app.route('/api/media', mediaRoutes)

// Health check endpoint with database verification
app.get('/health', async (c) => {
  try {
    // Verify database connection
    const result = await c.env.DB.prepare('SELECT 1 as ping').first()

    if (result && result.ping === 1) {
      return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: c.env.ENVIRONMENT
      })
    }

    // Database didn't return expected result
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database ping failed'
    }, 503)
  } catch (error) {
    // Database connection failed
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: (error as Error).message
    }, 503)
  }
})

// Error handler (must be last)
app.onError(errorHandler)

// Export worker
export default {
  async fetch(request: Request, env: HonoEnv['Bindings'], ctx: ExecutionContext) {
    // Validate required environment variables
    if (!env.JWT_SECRET) {
      return new Response(
        JSON.stringify({
          error: 'ServerError',
          message: 'JWT_SECRET environment variable is required. Set it with: wrangler secret put JWT_SECRET'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!env.PUBLIC_URL) {
      return new Response(
        JSON.stringify({
          error: 'ServerError',
          message: 'PUBLIC_URL environment variable is required. Set it in wrangler.toml'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Handle OPTIONS preflight requests
    if (request.method === 'OPTIONS') {
      const isDevelopment = env.ENVIRONMENT !== 'production'
      const origin = request.headers.get('Origin') || '*'

      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': isDevelopment ? '*' : (origin === 'https://rpg.apogeeforge.com' ? origin : ''),
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '600',
        },
      })
    }

    // Process request with Hono
    return app.fetch(request, env, ctx)
  },
}
