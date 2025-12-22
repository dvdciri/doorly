'use client'

import { useEffect } from 'react'

/**
 * Client component that tracks PageView events for Facebook Conversions API
 * This component should be added to pages where you want to track page views
 */
export default function PageViewTracker() {
  useEffect(() => {
    // Track page view when component mounts
    // Send user agent from client side for better tracking
    fetch('/api/facebook/pageview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }),
    }).catch((error) => {
      // Fail silently - don't break user experience
      console.error('PageView tracking failed:', error)
    })
  }, [])

  return null
}

