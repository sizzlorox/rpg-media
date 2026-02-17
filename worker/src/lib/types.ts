// Worker-specific type definitions
// Cloudflare Workers environment bindings

export interface Env {
  // Database binding
  DB: D1Database

  // R2 storage for media uploads
  MEDIA_BUCKET: R2Bucket

  // KV namespace for rate limiting
  RATE_LIMIT_KV: KVNamespace

  // Environment variables
  JWT_SECRET: string
  SENTRY_DSN?: string
  ENVIRONMENT: string
  PUBLIC_URL: string
}

// Extended Hono context with user from JWT
export interface HonoEnv {
  Bindings: Env
  Variables: {
    userId?: string
    username?: string
    level?: number
    requestId?: string
    parsedBody?: any
  }
}

// D1 prepared statement result types
export interface D1Result<T = unknown> {
  results: T[]
  success: boolean
  meta: {
    duration: number
    size_after: number
    rows_read: number
    rows_written: number
  }
}

// Rate limiting token bucket state
export interface RateLimitState {
  count: number
  resetTime: number
}
