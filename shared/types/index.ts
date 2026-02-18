// Shared TypeScript Types for Social Forge Platform
// Used by both worker (backend) and frontend
// Mirrors database schema with exact type mappings

// ==================== Database Models ====================

export interface User {
  id: string
  username: string
  password_hash: string
  level: number
  total_xp: number
  created_at: number
  updated_at: number
  avatar_url: string | null
  banner_url: string | null
  bio: string | null
  theme_preference: string
  email: string | null
  email_verified: number  // 0 or 1 (SQLite boolean)
  totp_enabled: number    // 0 or 1 (SQLite boolean)
}

export interface Post {
  id: string
  user_id: string
  content: string
  char_count: number
  media_url: string | null
  created_at: number
  updated_at: number
  is_pinned: number  // 0 or 1 (SQLite boolean)
  is_hidden: number  // 0 or 1 (SQLite boolean) - hidden posts pending moderation
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: number
}

export interface Comment {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: number
  updated_at: number
  is_hidden: number  // 0 or 1 (SQLite boolean) - hidden comments pending moderation
}

export interface Follow {
  id: string
  follower_id: string
  followee_id: string
  created_at: number
}

export interface LevelThreshold {
  level: number
  xp_required: number
  features_unlocked: string  // JSON array
}

export interface ModerationFlag {
  id: string
  content_type: 'post' | 'comment' | 'image'
  content_id: string
  user_id: string
  flagged_reason: string  // 'violence' | 'adult' | 'csam_suspected' | 'hate' | 'self_harm'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: number | null
  evidence_data: string  // JSON: API response, hash, confidence scores
  created_at: number
}

export interface ModerationCacheEntry {
  hash: string
  status: 'approved' | 'flagged' | 'rejected'
  flagged_categories: string | null  // JSON array
  confidence_scores: string | null   // JSON object
  first_seen_at: number
  last_seen_at: number
  occurrence_count: number
}

// ==================== API Response Types ====================

export interface UserProfile extends User {
  // Computed stats (not in database)
  total_posts: number
  total_likes_given: number
  total_likes_received: number
  total_comments_made: number
  followers_count: number
  following_count: number
  xp_for_current_level: number
  xp_for_next_level: number
  xp_progress_percent: number
}

export interface PostWithAuthor extends Post {
  author: {
    username: string
    level: number
    avatar_url: string | null
  }
  like_count: number
  comment_count: number
  is_liked_by_user: boolean
}

export interface CommentWithAuthor extends Comment {
  author: {
    username: string
    level: number
    avatar_url: string | null
  }
}

export interface CommentsResponse {
  comments: CommentWithAuthor[]
  pagination: {
    page: number
    limit: number
    total_comments: number
    total_pages: number
    has_more: boolean
    has_previous: boolean
  }
}

// ==================== API Request/Response Payloads ====================

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface CreatePostRequest {
  content: string
  media_url?: string
  is_pinned?: boolean
}

export interface CreatePostResponse {
  post: PostWithAuthor
  xp_awarded: number
  level_up: boolean
}

export interface LikePostResponse {
  like_count: number
  xp_awarded: {
    liker: number
    creator: number
  }
  level_up: boolean
}

export interface CreateCommentRequest {
  content: string
}

export interface CreateCommentResponse {
  comment: CommentWithAuthor
  xp_awarded: {
    commenter: number
    creator: number
  }
  level_up: boolean
}

export interface MediaUploadUrlResponse {
  upload_url: string
  public_url: string
  key: string
  expires_in: number
}

export interface MediaUploadResponse {
  success: boolean
  public_url: string
  key: string
}

export interface UpdateProfileRequest {
  avatar_url?: string
  banner_url?: string
  bio?: string
  theme_preference?: string
}

export interface FeedResponse {
  posts: PostWithAuthor[]
  has_more: boolean
}

export interface XPHistoryEntry {
  action: 'post' | 'like' | 'comment' | 'followed'
  xp_earned: number
  timestamp: number
  description: string
}

export interface XPHistoryResponse {
  history: XPHistoryEntry[]
}

export interface LevelThresholdsResponse {
  levels: {
    level: number
    xp_required: number
    features_unlocked: string[]
  }[]
}

// ==================== Content Moderation ====================

export interface ModerationResult {
  action: 'approved' | 'flagged' | 'rejected'
  categories: string[]              // e.g., ['violence', 'adult']
  confidenceScores: Record<string, number>
  reason?: string
  perceptualHash?: string           // for images
  cacheHit: boolean
}

export interface ModerationQueueResponse {
  flags: ModerationFlag[]
  pagination: {
    page: number
    limit: number
    total_flags: number
    total_pages: number
    has_more: boolean
  }
}

// ==================== Auth Security ====================

export interface TOTPChallengeResponse {
  requires_2fa: true
  totp_challenge_token: string
}

export interface TOTPSetupResponse {
  secret: string
  uri: string
  recovery_codes: string[]
}

export interface VerifyEmailRequest {
  token: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface VerifyTOTPRequest {
  totp_challenge_token: string
  code: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

// ==================== Error Response ====================

export interface ErrorResponse {
  error: string
  message: string
  code?: string
}

// ==================== JWT Payload ====================

export interface JWTPayload {
  sub: string  // user id
  username: string
  level: number
  iat?: number
  exp?: number
  [key: string]: any  // Allow additional properties for Hono JWT compatibility
}

// ==================== Feature Flags ====================

export type FeatureName =
  | 'basic_posting_280'
  | 'liking'
  | 'commenting'
  | 'following'
  | 'image_uploads'
  | 'extended_posts_500'
  | 'profile_customization'
  | 'avatar_upload'
  | 'banner_upload'
  | 'advanced_posts_1000'
  | 'custom_themes'
  | 'pinned_posts'
