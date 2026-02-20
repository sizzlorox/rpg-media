// External Link Confirmation Modal
// Feature: clickable-urls

import React, { useEffect } from 'react'

interface ExternalLinkModalProps {
  url: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal that asks the user to confirm opening an external URL.
 * Security: prevents accidental navigation and ensures user intent.
 */
export const ExternalLinkModal: React.FC<ExternalLinkModalProps> = ({ url, onConfirm, onCancel }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter') {
        onConfirm()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onConfirm, onCancel])

  return (
    <div className="external-link-modal-overlay" onClick={onCancel}>
      <div className="external-link-modal" onClick={(e) => e.stopPropagation()}>
        <div className="external-link-modal-title">[ EXTERNAL LINK ]</div>
        <div className="external-link-modal-label">URL:</div>
        <div className="external-link-modal-url">{url}</div>
        <div className="external-link-modal-warning">
          Open this link in a new tab?
        </div>
        <div className="external-link-modal-actions">
          <button
            className="external-link-modal-btn external-link-modal-btn-confirm"
            onClick={onConfirm}
            autoFocus
          >
            [OPEN]
          </button>
          <button
            className="external-link-modal-btn external-link-modal-btn-cancel"
            onClick={onCancel}
          >
            [CANCEL]
          </button>
        </div>
        <div className="external-link-modal-hint">Enter to open · Esc to cancel</div>
      </div>
    </div>
  )
}

ExternalLinkModal.displayName = 'ExternalLinkModal'
