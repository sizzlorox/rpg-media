// Cloudflare Worker Entry Point
// RPG Social Media Platform - Hono API

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
  origin: 'https://rpg.apogeeforge.com',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
}))
app.use('*', analyticsLogger)

// Routes
app.route('/auth', authRoutes)
app.route('/posts', postsRoutes)
app.route('/users', usersRoutes)
app.route('/feed', feedRoutes)
app.route('/', interactionsRoutes)
app.route('/xp', xpRoutes)
app.route('/levels', levelsRoutes)
app.route('/media', mediaRoutes)

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
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'https://rpg.apogeeforge.com',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
