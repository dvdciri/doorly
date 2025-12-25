'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface LegalModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  content: React.ReactNode
}

export default function LegalModal({
  isOpen,
  onClose,
  title,
  content,
}: LegalModalProps) {
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
      <div className="relative bg-navy-900 border border-navy-800 rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-fadeInUp z-50">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors p-2 hover:bg-navy-800 rounded-lg z-10"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 pr-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-50">
            {title}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
          <div className="text-gray-300 text-sm sm:text-base leading-relaxed space-y-6">
            {content}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-navy-800">
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

