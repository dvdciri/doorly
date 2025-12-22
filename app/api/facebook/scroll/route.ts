import { NextRequest, NextResponse } from 'next/server'
import { sendScrollEvent } from '@/lib/facebook-conversions'

export async function POST(request: NextRequest) {
  try {
    // Get scroll depth and user agent from request body (sent from client)
    const body = await request.json().catch(() => ({}))
    const { scrollDepth, userAgent, url } = body

    if (scrollDepth === undefined) {
      return NextResponse.json({ error: 'scrollDepth is required' }, { status: 400 })
    }

    // Create a modified request with user agent if provided
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

    // Send Scroll event to Facebook Conversions API
    await sendScrollEvent(modifiedRequest, {
      scrollDepth,
      userAgent: userAgent || undefined,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    // Fail silently - don't break user experience
    console.error('Scroll tracking failed:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

