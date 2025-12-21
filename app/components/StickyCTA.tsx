'use client'

import { useState, useEffect } from 'react'

export default function StickyCTA() {
  const [showCTA, setShowCTA] = useState(false)

  useEffect(() => {
    const checkScrollPosition = () => {
      const formElement = document.getElementById('hero-form')
      if (formElement) {
        const formRect = formElement.getBoundingClientRect()
        // Show CTA if the top of the form is above the viewport (scrolled past)
        // Using a small offset to account for the form's bottom padding
        setShowCTA(formRect.bottom < 0)
      } else {
        // If form element doesn't exist, don't show CTA
        setShowCTA(false)
      }
    }

    // Check on mount and scroll
    checkScrollPosition()
    window.addEventListener('scroll', checkScrollPosition, { passive: true })
    window.addEventListener('resize', checkScrollPosition, { passive: true })

    return () => {
      window.removeEventListener('scroll', checkScrollPosition)
      window.removeEventListener('resize', checkScrollPosition)
    }
  }, [])

  const scrollToForm = () => {
    const formElement = document.getElementById('hero-form')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Focus the first input after scrolling
      setTimeout(() => {
        const firstInput = formElement.querySelector('input, select') as HTMLElement
        if (firstInput) {
          firstInput.focus()
        }
      }, 500)
    }
  }

  if (!showCTA) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-navy-900/95 backdrop-blur-md border-t border-navy-800/50 shadow-2xl">
        <div className="px-4 py-3">
          <button
            onClick={scrollToForm}
            className="w-full bg-accent-red hover:bg-accent-red/90 text-white py-4 px-6 min-h-[56px] rounded-xl font-semibold text-base sm:text-lg transition-all shadow-lg shadow-accent-red/20 active:scale-95"
          >
            Get a cash offer
          </button>
        </div>
      </div>
    </div>
  )
}

