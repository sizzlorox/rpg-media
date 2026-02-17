/**
 * Admin Routes - Moderation Queue Management
 *
 * Endpoints for admins (level 100+) to review flagged content
 * and take action: approve, reject, or report to authorities.
 */

import { Hono } from 'hono'
import { HonoEnv } from '../lib/types'
import { authMiddleware } from '../middleware/auth'
import { createDatabaseClient } from '../lib/db'
import { sanitizeError } from '../lib/error-sanitizer'
import { trackEvent } from '../lib/logger'
import type { ModerationFlag, ModerationQueueResponse } from '../../../shared/types'

const admin = new Hono<HonoEnv>()

/**
 * Admin middleware - require level 100+
 */
const adminMiddleware = async (c: any, next: any) => {
  const level = c.get('level')

  if (level === undefined || level < 100) {
    return c.json({
      error: 'Forbidden',
      message: 'Admin access required (level 100+)',
    }, 403)
  }

  return next()
}

// GET /api/admin/moderation/queue - List flagged content for review
admin.get('/moderation/queue', authMiddleware, adminMiddleware, async (c) => {
  const userId = c.get('userId')

  try {
    // Query parameters for filtering
    const status = c.req.query('status') || 'pending' // 'pending' | 'approved' | 'rejected'
    const severity = c.req.query('severity') // 'low' | 'medium' | 'high' | 'critical'
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')

    if (page < 1 || limit < 1 || limit > 100) {
      return c.json({
        error: 'BadRequest',
        message: 'Invalid pagination parameters',
      }, 400)
    }

    const db = createDatabaseClient(c.env)
    const offset = (page - 1) * limit

    // Build query based on filters
    let query = 'SELECT * FROM moderation_flags WHERE 1=1'
    const params: any[] = []

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (severity) {
      query += ' AND severity = ?'
      params.push(severity)
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit + 1, offset) // Fetch limit+1 for has_more detection

    const results = await db.raw()
      .prepare(query)
      .bind(...params)
      .all()

    const flags = results.results as ModerationFlag[]
    const hasMore = flags.length > limit
    const pageFlags = hasMore ? flags.slice(0, limit) : flags

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM moderation_flags WHERE 1=1'
    const countParams: any[] = []

    if (status) {
      countQuery += ' AND status = ?'
      countParams.push(status)
    }

    if (severity) {
      countQuery += ' AND severity = ?'
      countParams.push(severity)
    }

    const countResult = await db.raw()
      .prepare(countQuery)
      .bind(...countParams)
      .first()

    const totalFlags = (countResult as any)?.total || 0
    const totalPages = Math.ceil(totalFlags / limit)

    trackEvent('admin_moderation_queue_viewed', {
      adminId: userId,
      status,
      severity,
      page,
      resultsCount: pageFlags.length,
    })

    return c.json({
      flags: pageFlags,
      pagination: {
        page,
        limit,
        total_flags: totalFlags,
        total_pages: totalPages,
        has_more: hasMore,
      },
    } as ModerationQueueResponse)
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// POST /api/admin/moderation/:id/approve - Approve flagged content
admin.post('/moderation/:id/approve', authMiddleware, adminMiddleware, async (c) => {
  const flagId = c.req.param('id')
  const adminId = c.get('userId')!

  try {
    const db = createDatabaseClient(c.env)

    // Get flag details
    const flag = await db.raw()
      .prepare('SELECT * FROM moderation_flags WHERE id = ?')
      .bind(flagId)
      .first() as ModerationFlag | null

    if (!flag) {
      return c.json({ error: 'NotFound', message: 'Moderation flag not found' }, 404)
    }

    if (flag.status !== 'pending') {
      return c.json({
        error: 'BadRequest',
        message: 'Flag has already been reviewed',
      }, 400)
    }

    const now = Date.now()

    // Update flag status
    await db.raw()
      .prepare(`
        UPDATE moderation_flags
        SET status = 'approved', reviewed_by = ?, reviewed_at = ?
        WHERE id = ?
      `)
      .bind(adminId, now, flagId)
      .run()

    // Unhide the content
    if (flag.content_type === 'post') {
      await db.raw()
        .prepare('UPDATE posts SET is_hidden = 0 WHERE id = ?')
        .bind(flag.content_id)
        .run()
    } else if (flag.content_type === 'comment') {
      await db.raw()
        .prepare('UPDATE comments SET is_hidden = 0 WHERE id = ?')
        .bind(flag.content_id)
        .run()
    }

    // Update moderation cache if there's a perceptual hash
    const evidenceData = JSON.parse(flag.evidence_data)
    if (evidenceData.perceptualHash) {
      await db.raw()
        .prepare(`
          UPDATE moderation_cache
          SET status = 'approved'
          WHERE hash = ?
        `)
        .bind(evidenceData.perceptualHash)
        .run()
    }

    trackEvent('admin_moderation_approved', {
      adminId,
      flagId,
      contentType: flag.content_type,
      contentId: flag.content_id,
      originalSeverity: flag.severity,
    })

    return c.json({
      success: true,
      message: 'Content approved and unhidden',
      flag_id: flagId,
    })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// POST /api/admin/moderation/:id/reject - Reject and delete flagged content
admin.post('/moderation/:id/reject', authMiddleware, adminMiddleware, async (c) => {
  const flagId = c.req.param('id')
  const adminId = c.get('userId')!

  try {
    const body = await c.req.json<{ report_csam?: boolean }>()
    const reportCSAM = body.report_csam || false

    const db = createDatabaseClient(c.env)

    // Get flag details
    const flag = await db.raw()
      .prepare('SELECT * FROM moderation_flags WHERE id = ?')
      .bind(flagId)
      .first() as ModerationFlag | null

    if (!flag) {
      return c.json({ error: 'NotFound', message: 'Moderation flag not found' }, 404)
    }

    if (flag.status !== 'pending') {
      return c.json({
        error: 'BadRequest',
        message: 'Flag has already been reviewed',
      }, 400)
    }

    const now = Date.now()

    // Update flag status
    await db.raw()
      .prepare(`
        UPDATE moderation_flags
        SET status = 'rejected', reviewed_by = ?, reviewed_at = ?
        WHERE id = ?
      `)
      .bind(adminId, now, flagId)
      .run()

    // Delete the content
    if (flag.content_type === 'post') {
      await db.raw()
        .prepare('DELETE FROM posts WHERE id = ?')
        .bind(flag.content_id)
        .run()
    } else if (flag.content_type === 'comment') {
      await db.raw()
        .prepare('DELETE FROM comments WHERE id = ?')
        .bind(flag.content_id)
        .run()
    } else if (flag.content_type === 'image') {
      // Delete from R2 storage
      const evidenceData = JSON.parse(flag.evidence_data)
      const key = evidenceData.key

      if (key) {
        await c.env.MEDIA_BUCKET.delete(key)
      }
    }

    // Update moderation cache to auto-block future uploads
    const evidenceData = JSON.parse(flag.evidence_data)
    if (evidenceData.perceptualHash) {
      await db.raw()
        .prepare(`
          UPDATE moderation_cache
          SET status = 'rejected'
          WHERE hash = ?
        `)
        .bind(evidenceData.perceptualHash)
        .run()
    }

    // CSAM reporting (V1: email alert to admin team)
    if (reportCSAM && flag.severity === 'critical') {
      console.error('CRITICAL: CSAM suspected - Manual NCMEC report required', {
        flagId,
        userId: flag.user_id,
        contentId: flag.content_id,
        perceptualHash: evidenceData.perceptualHash,
        reviewedBy: adminId,
      })

      trackEvent('csam_report_required', {
        flagId,
        reviewedBy: adminId,
        contentType: flag.content_type,
        // DO NOT log content details to analytics
      })

      // In V2: Integrate with NCMEC CyberTipline API
      // await reportToNCMEC({ flagId, userId: flag.user_id, evidenceData })
    }

    trackEvent('admin_moderation_rejected', {
      adminId,
      flagId,
      contentType: flag.content_type,
      contentId: flag.content_id,
      originalSeverity: flag.severity,
      csamReport: reportCSAM,
    })

    return c.json({
      success: true,
      message: 'Content rejected and deleted',
      flag_id: flagId,
      csam_report_logged: reportCSAM && flag.severity === 'critical',
    })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

export default admin
