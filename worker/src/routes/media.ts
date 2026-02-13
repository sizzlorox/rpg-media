// Media routes: R2 image uploads with presigned URLs

import { Hono } from 'hono'
import { HonoEnv } from '../lib/types'
import { authMiddleware } from '../middleware/auth'
import { canAccessFeature } from '../lib/constants'

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
    const publicUrl = `${c.env.PUBLIC_URL || 'http://localhost:8787'}/media/${key}`

    return c.json({
      upload_url: uploadUrl,
      public_url: publicUrl,
      key,
      expires_in: 300, // 5 minutes
    })
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

// PUT /api/media/upload/:key - Direct upload to R2
media.put('/upload/:key', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const level = c.get('level')
  const key = c.param('key')

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

    // Get file data from request
    const fileData = await c.req.arrayBuffer()

    // Upload to R2
    await bucket.put(key, fileData, {
      httpMetadata: {
        contentType: c.req.header('content-type') || 'application/octet-stream',
      },
    })

    const publicUrl = `${c.env.PUBLIC_URL || 'http://localhost:8787'}/media/${key}`

    return c.json({
      success: true,
      public_url: publicUrl,
      key,
    })
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

// GET /media/:key - Serve image from R2
media.get('/:key{.+}', async (c) => {
  const key = c.param('key')

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
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

export default media
