// Cloudflare Worker Entry Point
// Social Forge Platform - Hono API

import { Hono } from 'hono'
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

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

// Error handler (must be last)
app.onError(errorHandler)

// Export worker
export default {
  async fetch(request: Request, env: HonoEnv['Bindings'], ctx: ExecutionContext) {
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
