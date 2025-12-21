'use client'

import { useEffect } from 'react'
import { CheckCircle, X } from 'lucide-react'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  message?: string
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  message = "Thank you for your submission. We will be in touch within 48 hours.",
}: ConfirmationDialogProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-navy-900 border border-navy-800 rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl max-w-md w-full animate-fadeInUp z-50">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors p-2 hover:bg-navy-800 rounded-lg"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Success icon */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-accent-red/20 border border-accent-red/30">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-accent-red" />
            </div>
          </div>

          {/* Message */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-50 mb-4">
            We got your details
          </h2>
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed mb-6">
            {message}
          </p>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full bg-accent-red hover:bg-accent-red/90 text-white py-3 px-6 rounded-xl font-semibold text-base sm:text-lg transition-colors shadow-lg shadow-accent-red/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

