// API client service with fetch wrapper
// Handles authentication, error handling, and JSON parsing

import type { MediaUploadUrlResponse } from '../../../shared/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface RequestOptions extends RequestInit {
  body?: any
}

// Singleton refresh promise — ensures N concurrent 401s produce exactly 1 refresh call
let refreshPromise: Promise<void> | null = null

async function attemptTokenRefresh(): Promise<void> {
  if (refreshPromise) return refreshPromise  // queue behind in-flight refresh

  refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) {
        window.dispatchEvent(new CustomEvent('auth:session-expired'))
        throw new Error('Session expired')
      }
    })
    .finally(() => { refreshPromise = null })

  return refreshPromise
}

class APIClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    _isRetry = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies
    }

    if (options.body && typeof options.body !== 'string') {
      config.body = JSON.stringify(options.body)
    }

    try {
      const response = await fetch(url, config)

      // Handle empty responses (204 No Content, etc.)
      if (response.status === 204) {
        return {} as T
      }

      // Transparent token refresh: on 401, try to get a new access token then retry once
      if (response.status === 401 && !_isRetry) {
        if (endpoint === '/auth/refresh') {
          // Refresh endpoint itself returned 401 — session truly gone
          window.dispatchEvent(new CustomEvent('auth:session-expired'))
          throw new Error('Session expired. Please log in again.')
        }
        try {
          await attemptTokenRefresh()
          return this.request<T>(endpoint, options, true)
        } catch {
          throw new Error('Session expired. Please log in again.')
        }
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return data as T
    } catch (error) {
      // Skip Sentry for expected session-expired errors
      if (error instanceof Error && error.message.includes('Session expired')) {
        throw error
      }
      // Log to Sentry for production monitoring
      if (error instanceof Error) {
        const { captureException } = await import('@sentry/react')
        captureException(error)
      }
      throw error
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  // POST request
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body })
  }

  // PUT request
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body })
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // PATCH request
  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body })
  }

  /**
   * Upload a file with progress tracking
   * Uses a two-step presigned URL flow:
   * 1. POST to /api/media/upload-url to get presigned URL
   * 2. PUT binary data to presigned URL
   *
   * @param file - File to upload
   * @param onProgress - Optional progress callback (0-100)
   * @returns Promise resolving to { publicUrl, key }
   * @throws Error with terminal-friendly message on failure
   */
  async uploadFileWithProgress(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ publicUrl: string; key: string }> {
    try {
      // Step 1: Get presigned upload URL
      const uploadUrlData = await this.post<MediaUploadUrlResponse>('/media/upload-url', {
        filename: file.name,
        contentType: file.type
      })

      // Step 2: Upload file to presigned URL with progress tracking
      const uploadSuccess = await this.uploadToPresignedUrl(
        uploadUrlData.upload_url,
        file,
        onProgress
      )

      if (!uploadSuccess) {
        throw new Error('Upload to storage failed')
      }

      return {
        publicUrl: uploadUrlData.public_url,
        key: uploadUrlData.key
      }
    } catch (error) {
      console.error('Upload error details:', error)
      const message = error instanceof Error ? error.message : 'Unknown upload error'
      throw new Error(`Upload failed: ${message}`)
    }
  }

  /**
   * Upload file to presigned URL using XMLHttpRequest (for progress tracking)
   * @param url - Presigned upload URL
   * @param file - File to upload
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to true on success
   */
  private uploadToPresignedUrl(
    url: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100)
          onProgress(percent)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(true)
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'))
      })

      xhr.open('PUT', url)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }
}

export const apiClient = new APIClient()
