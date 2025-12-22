import { NextRequest, NextResponse } from 'next/server'
import { sendPageViewEvent } from '@/lib/facebook-conversions'

export async function POST(request: NextRequest) {
  try {
    // Get user agent and URL from request body (sent from client)
    const body = await request.json().catch(() => ({}))
    const { userAgent, url } = body

    // Create a modified request with user agent if provided
    // This helps with better user matching in Facebook Conversions API
    const modifiedRequest = userAgent
      ? new Request(request.url, {
          method: request.method,
          headers: {
            ...Object.fromEntries(request.headers.entries()),
            'user-agent': userAgent,
            referer: url || request.headers.get('referer') || undefined,
          },
        })
      : request

    // Send PageView event to Facebook Conversions API
    await sendPageViewEvent(modifiedRequest, {
      userAgent: userAgent || undefined,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    // Fail silently - don't break user experience
    console.error('PageView tracking failed:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

