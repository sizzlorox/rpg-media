// Authentication routes: register, login, logout, me

import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { HonoEnv } from '../lib/types'
import { createDatabaseClient } from '../lib/db'
import { AuthService } from '../services/auth-service'
import { authMiddleware } from '../middleware/auth'
import { RegisterRequest, LoginRequest } from '../../../../shared/types'

const auth = new Hono<HonoEnv>()

// POST /api/auth/register
auth.post('/register', async (c) => {
  const body = await c.req.json<RegisterRequest>()
  const { username, password } = body

  if (!username || !password) {
    return c.json({ error: 'BadRequest', message: 'Username and password required' }, 400)
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    const userProfile = await authService.register(username, password)

    // Generate token for auto-login
    const { token } = await authService.login(username, password)

    // Set httpOnly cookie for cross-origin requests
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return c.json(userProfile, 201)
  } catch (error) {
    if ((error as Error).message.includes('already exists')) {
      return c.json({ error: 'Conflict', message: (error as Error).message }, 409)
    }
    return c.json({ error: 'BadRequest', message: (error as Error).message }, 400)
  }
})

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json<LoginRequest>()
  const { username, password } = body

  if (!username || !password) {
    return c.json({ error: 'BadRequest', message: 'Username and password required' }, 400)
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    const { user, token } = await authService.login(username, password)

    // Set httpOnly cookie for cross-origin requests
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return c.json(user)
  } catch (error) {
    return c.json({ error: 'Unauthorized', message: 'Invalid credentials' }, 401)
  }
})

// POST /api/auth/logout
auth.post('/logout', authMiddleware, (c) => {
  deleteCookie(c, 'auth_token', {
    path: '/',
  })

  return c.json({ message: 'Logged out successfully' })
})

// GET /api/auth/me
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    const user = await authService.getCurrentUser(userId)

    return c.json(user)
  } catch (error) {
    return c.json({ error: 'NotFound', message: 'User not found' }, 404)
  }
})

export default auth
