// Security Headers Middleware
// Adds essential security headers to all responses

import { Context, Next } from 'hono'
import { HonoEnv } from '../lib/types'

/**
 * Middleware to add security headers to all responses
 * Implements OWASP security best practices
 */
export const securityHeaders = async (c: Context<HonoEnv>, next: Next) => {
  await next()

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking attacks
  c.header('X-Frame-Options', 'DENY')

  // Enable XSS protection (legacy browsers)
  c.header('X-XSS-Protection', '1; mode=block')

  // Control referrer information
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Content Security Policy
  // Allows: self, inline styles (for terminal), Cloudflare analytics
  c.header('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '))

  // Strict Transport Security (HTTPS only)
  if (c.env.ENVIRONMENT === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Permissions Policy (restrict browser features)
  c.header('Permissions-Policy', [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()'
  ].join(', '))
}
