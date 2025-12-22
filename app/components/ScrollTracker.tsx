'use client'

import { useEffect, useRef } from 'react'

/**
 * Client component that tracks Scroll events for Facebook Conversions API
 * Tracks scroll depth at 25%, 50%, 75%, and 100%
 */
export default function ScrollTracker() {
  const trackedDepths = useRef<Set<number>>(new Set())

  useEffect(() => {
    const handleScroll = () => {
      // Calculate scroll depth percentage
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      
      const scrollDepth = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      )

      // Track at 25%, 50%, 75%, and 100% milestones
      const milestones = [25, 50, 75, 100]
      const milestone = milestones.find(
        (m) => scrollDepth >= m && !trackedDepths.current.has(m)
      )

      if (milestone) {
        // Mark this milestone as tracked
        trackedDepths.current.add(milestone)

        // Send scroll event to API
        fetch('/api/facebook/scroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scrollDepth: milestone,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
          }),
        }).catch((error) => {
          // Fail silently - don't break user experience
          console.error('Scroll tracking failed:', error)
        })
      }
    }

    // Throttle scroll events for better performance
    let ticking = false
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', throttledHandleScroll, { passive: true })

    // Cleanup
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll)
    }
  }, [])

  return null
}

