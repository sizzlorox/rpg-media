// Media routes: R2 image uploads with presigned URLs

import { Hono } from 'hono'
import { HonoEnv } from '../lib/types'
import { authMiddleware } from '../middleware/auth'
import { canAccessFeature } from '../lib/constants'
import { sanitizeError } from '../lib/error-sanitizer'
import { ContentModerationService } from '../services/content-moderation'
import { createDatabaseClient } from '../lib/db'
import { trackEvent } from '../lib/logger'

const media = new Hono<HonoEnv>()

// POST /api/media/upload-url - Generate presigned URL for image upload (level 3+)
media.post('/upload-url', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const level = c.get('level')

  if (!userId || level === undefined) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  // Check if user has image upload permission (level 3+)
  if (!canAccessFeature(level, 'image_uploads')) {
    return c.json({
      error: 'Forbidden',
      message: 'Image uploads unlock at level 3',
    }, 403)
  }

  try {
    const body = await c.req.json<{ filename: string; contentType: string }>()
    const { filename, contentType } = body

    if (!filename || !contentType) {
      return c.json({
        error: 'BadRequest',
        message: 'filename and contentType are required',
      }, 400)
    }

    // Validate content type (images only)
    if (!contentType.startsWith('image/')) {
      return c.json({
        error: 'BadRequest',
        message: 'Only image files are allowed',
      }, 400)
    }

    // Generate unique filename with user ID prefix
    const timestamp = Date.now()
    const extension = filename.split('.').pop()
    const key = `uploads/${userId}/${timestamp}.${extension}`

    // Generate presigned URL for R2 upload (expires in 5 minutes)
    // Note: This requires R2 bucket to be configured in wrangler.toml
    const bucket = c.env.MEDIA_BUCKET

    if (!bucket) {
      return c.json({
        error: 'ServiceUnavailable',
        message: 'Media storage not configured',
      }, 503)
    }

    // For R2, we'll use the object.put() method and return a signed URL
    // In production, you'd generate a presigned URL with proper authentication
    // For now, we'll return the key and handle upload via a separate endpoint
    const uploadUrl = `/api/media/upload/${encodeURIComponent(key)}`
    const publicUrl = `${c.env.PUBLIC_URL || 'http://localhost:8787'}/api/media/${key}`

    return c.json({
      upload_url: uploadUrl,
      public_url: publicUrl,
      key,
      expires_in: 300, // 5 minutes
    })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// PUT /api/media/upload/:key - Direct upload to R2
media.put('/upload/:key', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const level = c.get('level')
  const key = c.req.param('key')

  if (!userId || level === undefined) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  // Check if user has image upload permission (level 3+)
  if (!canAccessFeature(level, 'image_uploads')) {
    return c.json({
      error: 'Forbidden',
      message: 'Image uploads unlock at level 3',
    }, 403)
  }

  // Verify the key starts with user's ID (security check)
  if (!key.startsWith(`uploads/${userId}/`)) {
    return c.json({
      error: 'Forbidden',
      message: 'Cannot upload to this key',
    }, 403)
  }

  try {
    const bucket = c.env.MEDIA_BUCKET

    if (!bucket) {
      return c.json({
        error: 'ServiceUnavailable',
        message: 'Media storage not configured',
      }, 503)
    }

    // Validate file size (5MB limit)
    const contentLength = c.req.header('content-length')
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

    if (!contentLength || parseInt(contentLength) > MAX_FILE_SIZE) {
      return c.json({
        error: 'BadRequest',
        message: 'File size must not exceed 5MB'
      }, 400)
    }

    // Get file data from request
    const fileData = await c.req.arrayBuffer()

    // Validate image content by checking magic bytes
    const bytes = new Uint8Array(fileData)
    const isValidImage =
      (bytes[0] === 0xFF && bytes[1] === 0xD8) || // JPEG
      (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) || // PNG
      (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) || // GIF
      (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) // WebP (RIFF)

    if (!isValidImage) {
      return c.json({
        error: 'BadRequest',
        message: 'Invalid image file. Only JPEG, PNG, GIF, and WebP are supported.'
      }, 400)
    }

    // Moderate image content before uploading to R2
    const db = createDatabaseClient(c.env)
    const moderationService = new ContentModerationService(c.env, db.raw())
    const moderationResult = await moderationService.moderateImage(fileData, key)

    // Auto-reject if flagged as illegal content - DO NOT upload to R2
    if (moderationResult.action === 'rejected') {
      trackEvent('image_rejected_moderation', {
        userId,
        key,
        categories: moderationResult.categories,
        confidenceScores: moderationResult.confidenceScores,
        perceptualHash: moderationResult.perceptualHash,
      })

      return c.json({
        error: 'ContentViolation',
        message: 'This image contains prohibited content and cannot be uploaded.',
        categories: moderationResult.categories,
      }, 400)
    }

    // Upload to R2 with moderation metadata
    const customMetadata: Record<string, string> = {
      uploaded_by: userId,
      perceptual_hash: moderationResult.perceptualHash || '',
      moderation_status: moderationResult.action,
    }

    // If flagged, mark for admin review
    if (moderationResult.action === 'flagged') {
      customMetadata.moderation_status = 'pending_review'
      customMetadata.flagged_categories = JSON.stringify(moderationResult.categories)

      // Create moderation flag for admin review
      const severity = moderationResult.categories.includes('violence') ? 'high'
        : moderationResult.categories.includes('adult') ? 'critical'
        : 'medium'

      await moderationService.createModerationFlag({
        contentType: 'image',
        contentId: key,
        userId,
        flaggedReason: moderationResult.categories[0] || 'unknown',
        severity,
        evidenceData: {
          categories: moderationResult.categories,
          confidenceScores: moderationResult.confidenceScores,
          perceptualHash: moderationResult.perceptualHash,
          key,
        },
      })

      trackEvent('image_flagged_moderation', {
        userId,
        key,
        categories: moderationResult.categories,
        severity,
        perceptualHash: moderationResult.perceptualHash,
      })
    }

    await bucket.put(key, fileData, {
      httpMetadata: {
        contentType: c.req.header('content-type') || 'application/octet-stream',
      },
      customMetadata,
    })

    const publicUrl = `${c.env.PUBLIC_URL || 'http://localhost:8787'}/api/media/${key}`

    return c.json({
      success: true,
      public_url: publicUrl,
      key,
      moderation_status: moderationResult.action,
      cache_hit: moderationResult.cacheHit,
    })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// GET /media/:key - Serve image from R2
media.get('/:key{.+}', async (c) => {
  const key = c.req.param('key')

  try {
    const bucket = c.env.MEDIA_BUCKET

    if (!bucket) {
      return c.json({
        error: 'ServiceUnavailable',
        message: 'Media storage not configured',
      }, 503)
    }

    const object = await bucket.get(key)

    if (!object) {
      return c.json({ error: 'NotFound', message: 'Image not found' }, 404)
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

export default media
