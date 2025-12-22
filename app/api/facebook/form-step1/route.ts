import { NextRequest, NextResponse } from 'next/server'
import { sendFormStep1Event } from '@/lib/facebook-conversions'

export async function POST(request: NextRequest) {
  try {
    // Get form data and user agent from request body (sent from client)
    const body = await request.json().catch(() => ({}))
    const { address, propertyState, name, phone, userAgent, url } = body

    if (!address || !propertyState) {
      return NextResponse.json(
        { error: 'address and propertyState are required' },
        { status: 400 }
      )
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

    // Send FormStep1 event to Facebook Conversions API
    await sendFormStep1Event(modifiedRequest, {
      address,
      propertyState,
      name: name || undefined,
      phone: phone || undefined,
      userAgent: userAgent || undefined,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    // Fail silently - don't break user experience
    console.error('FormStep1 tracking failed:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

