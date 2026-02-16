// Upload UI utilities for image validation and rendering

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateImageFile(file: File, maxSizeMB: number = 5): ValidationResult {
  const MAX_SIZE = maxSizeMB * 1024 * 1024
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`
    }
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${formatFileSize(MAX_SIZE)}`
    }
  }

  return { valid: true }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function renderUploadProgress(progress: number, terminalCols?: number): string {
  const width = Math.min(40, (terminalCols || 80) - 10)
  const filled = Math.floor((progress / 100) * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)

  return `\x1B[32mUploading...\x1B[0m\r\n[${bar}] ${progress}%\r\n`
}

export function renderImageFrame(imageUrl: string, altText: string = 'Image', terminalCols?: number): string {
  const width = terminalCols || 80
  const text = `[Image: ${altText}]`
  const url = imageUrl.length > width - 4 ? imageUrl.substring(0, width - 7) + '...' : imageUrl

  return `\x1B[36m${text}\x1B[0m\r\n\x1B[90m${url}\x1B[0m\r\n`
}
