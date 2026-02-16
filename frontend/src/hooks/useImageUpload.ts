// Hook for managing image upload state and progress
import { useState, useCallback } from 'react'
import { apiClient } from '../services/api-client'
import { validateImageFile } from '../utils/upload-ui'

interface UseImageUploadReturn {
  selectedFile: File | null
  uploading: boolean
  progress: number
  error: string | null
  selectFile: (file: File | null) => Promise<{ valid: boolean; error?: string }>
  upload: (
    fileOrProgress?: File | ((percent: number) => void),
    onProgress?: (percent: number) => void
  ) => Promise<{ publicUrl: string; key: string } | null>
  reset: () => void
}

/**
 * Hook for managing image upload lifecycle
 * Handles file selection, validation, upload state, and progress tracking
 *
 * @param maxSizeMB - Maximum file size in MB (default: 5)
 * @returns Upload state and methods
 */
export function useImageUpload(maxSizeMB: number = 5): UseImageUploadReturn {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  /**
   * Select and validate a file
   * @param file - File to select (or null to clear)
   * @returns Validation result
   */
  const selectFile = useCallback(async (file: File | null): Promise<{ valid: boolean; error?: string }> => {
    setError(null)
    setProgress(0)

    if (!file) {
      setSelectedFile(null)
      return { valid: false, error: 'No file selected' }
    }

    // Validate file
    const validation = await validateImageFile(file, maxSizeMB)

    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      setSelectedFile(null)
      return validation
    }

    setSelectedFile(file)
    return { valid: true }
  }, [maxSizeMB])

  /**
   * Upload a file with progress tracking
   * @param file - File to upload (optional, uses selectedFile if not provided)
   * @param onProgress - Optional progress callback
   * @returns Upload result or null on error
   */
  const upload = useCallback(async (
    fileOrProgress?: File | ((percent: number) => void),
    onProgress?: (percent: number) => void
  ): Promise<{ publicUrl: string; key: string } | null> => {
    // Handle overloaded parameters
    let fileToUpload: File | null
    let progressCallback: ((percent: number) => void) | undefined

    if (typeof fileOrProgress === 'function') {
      // upload(onProgress)
      fileToUpload = selectedFile
      progressCallback = fileOrProgress
    } else if (fileOrProgress instanceof File) {
      // upload(file, onProgress)
      fileToUpload = fileOrProgress
      progressCallback = onProgress
    } else {
      // upload()
      fileToUpload = selectedFile
      progressCallback = undefined
    }

    console.log('[useImageUpload] Starting upload, file:', fileToUpload)

    if (!fileToUpload) {
      console.error('[useImageUpload] No file to upload')
      setError('No file selected')
      return null
    }

    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      console.log('[useImageUpload] Calling apiClient.uploadFileWithProgress')
      const result = await apiClient.uploadFileWithProgress(fileToUpload, (percent) => {
        setProgress(percent)
        if (progressCallback) {
          progressCallback(percent)
        }
      })

      console.log('[useImageUpload] Upload successful:', result)
      setProgress(100)
      return result
    } catch (err) {
      console.error('[useImageUpload] Upload error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      return null
    } finally {
      setUploading(false)
    }
  }, [selectedFile])

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    setSelectedFile(null)
    setUploading(false)
    setProgress(0)
    setError(null)
  }, [])

  return {
    selectedFile,
    uploading,
    progress,
    error,
    selectFile,
    upload,
    reset
  }
}
