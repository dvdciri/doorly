import { NextResponse } from 'next/server'
import { processDueWelcomeMessages } from '@/lib/welcome-message'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return false
  }

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processDueWelcomeMessages()
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Welcome message cron failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process welcome messages' },
      { status: 500 }
    )
  }
}
