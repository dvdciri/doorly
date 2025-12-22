/**
 * Facebook Conversions API utility
 * Sends server-side events to Facebook for ad attribution and measurement
 */

interface PageViewEventData {
  userAgent?: string
  ipAddress?: string
  eventId?: string
}

interface LeadEventData {
  phone?: string
  name?: string
  address?: string
  propertyState?: string
  userAgent?: string
  ipAddress?: string
  eventId?: string
}

interface ScrollEventData {
  scrollDepth?: number
  userAgent?: string
  ipAddress?: string
  eventId?: string
}

interface FormStep1EventData {
  address?: string
  propertyState?: string
  name?: string
  phone?: string
  userAgent?: string
  ipAddress?: string
  eventId?: string
}

/**
 * Hash a string using SHA-256 for Facebook's user_data requirements
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a unique event ID for deduplication
 */
function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Extract IP address from request headers
 */
function getClientIP(headers: Headers): string | undefined {
  // Check various headers that might contain the real IP
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  return undefined
}

/**
 * Send a PageView event to Facebook Conversions API
 */
export async function sendPageViewEvent(
  request: Request,
  data?: PageViewEventData
): Promise<void> {
  const pixelId = process.env.FACEBOOK_PIXEL_ID
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.FACEBOOK_PIXEL_TOKEN

  if (!pixelId || !accessToken) {
    console.warn('Facebook Conversions API: Missing PIXEL_ID or ACCESS_TOKEN')
    return
  }

  try {
    const headers = request.headers
    const userAgent = data?.userAgent || headers.get('user-agent') || undefined
    const ipAddress = data?.ipAddress || getClientIP(headers)
    const eventId = data?.eventId || generateEventId()
    const eventTime = Math.floor(Date.now() / 1000)

    // Prepare user data
    const userData: Record<string, string | undefined> = {
      client_ip_address: ipAddress,
      client_user_agent: userAgent,
    }

    // Prepare event data
    const eventData = {
      event_name: 'PageView',
      event_time: eventTime,
      event_id: eventId,
      event_source_url: headers.get('referer') || undefined,
      action_source: 'website',
      user_data: userData,
    }

    // Prepare request body
    const requestBody = {
      data: [eventData],
    }

    // Send to Facebook Conversions API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Facebook Conversions API PageView error:', {
        status: response.status,
        error: errorText,
      })
    }
  } catch (error) {
    // Fail silently - don't break user experience
    console.error('Facebook Conversions API PageView failed:', error)
  }
}

/**
 * Send a Lead event to Facebook Conversions API
 */
export async function sendLeadEvent(
  request: Request,
  data: LeadEventData
): Promise<void> {
  const pixelId = process.env.FACEBOOK_PIXEL_ID
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.FACEBOOK_PIXEL_TOKEN

  if (!pixelId || !accessToken) {
    console.warn('Facebook Conversions API: Missing PIXEL_ID or ACCESS_TOKEN')
    return
  }

  try {
    const headers = request.headers
    const userAgent = data.userAgent || headers.get('user-agent') || undefined
    const ipAddress = data.ipAddress || getClientIP(headers)
    const eventId = data.eventId || generateEventId()
    const eventTime = Math.floor(Date.now() / 1000)

    // Prepare user data with hashed PII
    const userData: Record<string, string | undefined> = {
      client_ip_address: ipAddress,
      client_user_agent: userAgent,
    }

    // Hash phone number if provided
    if (data.phone) {
      const cleanedPhone = data.phone.replace(/[\s\-\(\)\+]/g, '')
      // Remove leading 0 or 44 for UK numbers
      const normalizedPhone = cleanedPhone.startsWith('44')
        ? cleanedPhone.substring(2)
        : cleanedPhone.startsWith('0')
        ? cleanedPhone.substring(1)
        : cleanedPhone
      
      if (normalizedPhone) {
        userData.ph = await hashString(normalizedPhone)
      }
    }

    // Hash name if provided (Facebook accepts hashed names)
    if (data.name) {
      userData.fn = await hashString(data.name.split(' ')[0] || '')
      if (data.name.split(' ').length > 1) {
        userData.ln = await hashString(data.name.split(' ').slice(1).join(' '))
      }
    }

    // Prepare event data
    const eventData = {
      event_name: 'Lead',
      event_time: eventTime,
      event_id: eventId,
      event_source_url: headers.get('referer') || undefined,
      action_source: 'website',
      user_data: userData,
      custom_data: {
        content_name: 'Property Submission',
        content_category: 'Lead Form',
        address: data.address || undefined,
        property_state: data.propertyState || undefined,
        name: data.name || undefined,
        phone: data.phone || undefined,
      },
    }

    // Prepare request body
    const requestBody = {
      data: [eventData],
    }

    // Send to Facebook Conversions API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Facebook Conversions API Lead error:', {
        status: response.status,
        error: errorText,
      })
    }
  } catch (error) {
    // Fail silently - don't break user experience
    console.error('Facebook Conversions API Lead failed:', error)
  }
}

/**
 * Send a Scroll event to Facebook Conversions API
 */
export async function sendScrollEvent(
  request: Request,
  data: ScrollEventData
): Promise<void> {
  const pixelId = process.env.FACEBOOK_PIXEL_ID
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.FACEBOOK_PIXEL_TOKEN

  if (!pixelId || !accessToken) {
    console.warn('Facebook Conversions API: Missing PIXEL_ID or ACCESS_TOKEN')
    return
  }

  try {
    const headers = request.headers
    const userAgent = data.userAgent || headers.get('user-agent') || undefined
    const ipAddress = data.ipAddress || getClientIP(headers)
    const eventId = data.eventId || generateEventId()
    const eventTime = Math.floor(Date.now() / 1000)

    // Prepare user data
    const userData: Record<string, string | undefined> = {
      client_ip_address: ipAddress,
      client_user_agent: userAgent,
    }

    // Prepare event data
    const eventData = {
      event_name: 'Scroll',
      event_time: eventTime,
      event_id: eventId,
      event_source_url: headers.get('referer') || undefined,
      action_source: 'website',
      user_data: userData,
      custom_data: {
        scroll_depth: data.scrollDepth || 0,
      },
    }

    // Prepare request body
    const requestBody = {
      data: [eventData],
    }

    // Send to Facebook Conversions API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Facebook Conversions API Scroll error:', {
        status: response.status,
        error: errorText,
      })
    }
  } catch (error) {
    // Fail silently - don't break user experience
    console.error('Facebook Conversions API Scroll failed:', error)
  }
}

/**
 * Send a FormStep1Complete event (InitiateCheckout) to Facebook Conversions API
 * This tracks when users complete step 1 of the form (partial submission)
 */
export async function sendFormStep1Event(
  request: Request,
  data: FormStep1EventData
): Promise<void> {
  const pixelId = process.env.FACEBOOK_PIXEL_ID
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.FACEBOOK_PIXEL_TOKEN

  if (!pixelId || !accessToken) {
    console.warn('Facebook Conversions API: Missing PIXEL_ID or ACCESS_TOKEN')
    return
  }

  try {
    const headers = request.headers
    const userAgent = data.userAgent || headers.get('user-agent') || undefined
    const ipAddress = data.ipAddress || getClientIP(headers)
    const eventId = data.eventId || generateEventId()
    const eventTime = Math.floor(Date.now() / 1000)

    // Prepare user data
    const userData: Record<string, string | undefined> = {
      client_ip_address: ipAddress,
      client_user_agent: userAgent,
    }

    // Prepare event data
    // Using InitiateCheckout as it's a standard Facebook event for partial form submissions
    const eventData = {
      event_name: 'InitiateCheckout',
      event_time: eventTime,
      event_id: eventId,
      event_source_url: headers.get('referer') || undefined,
      action_source: 'website',
      user_data: userData,
      custom_data: {
        content_name: 'Property Form Step 1',
        content_category: 'Form Partial Submission',
        address: data.address || undefined,
        property_state: data.propertyState || undefined,
        name: data.name || undefined,
        phone: data.phone || undefined,
      },
    }

    // Prepare request body
    const requestBody = {
      data: [eventData],
    }

    // Send to Facebook Conversions API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Facebook Conversions API FormStep1 error:', {
        status: response.status,
        error: errorText,
      })
    }
  } catch (error) {
    // Fail silently - don't break user experience
    console.error('Facebook Conversions API FormStep1 failed:', error)
  }
}

