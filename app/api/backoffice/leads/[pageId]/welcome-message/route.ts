import { NextResponse } from 'next/server'
import { getWelcomeMessageJobByNotionPageId } from '@/lib/db'
import {
  isWelcomeMessageEnabled,
  retryWelcomeMessage,
  serializeWelcomeMessageJob,
} from '@/lib/welcome-message'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: { pageId: string } }
) {
  try {
    if (!isWelcomeMessageEnabled()) {
      return NextResponse.json(
        { error: 'Welcome messages are disabled' },
        { status: 400 }
      )
    }

    const job = await getWelcomeMessageJobByNotionPageId(params.pageId)
    if (!job) {
      return NextResponse.json(
        { error: 'No welcome message found for this lead' },
        { status: 404 }
      )
    }

    if (job.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed welcome messages can be resent' },
        { status: 400 }
      )
    }

    const result = await retryWelcomeMessage(params.pageId)
    const updatedJob = await getWelcomeMessageJobByNotionPageId(params.pageId)

    if (result === 'not_found' || result === 'not_retryable') {
      return NextResponse.json(
        { error: 'Welcome message could not be resent' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      result,
      welcomeMessage: updatedJob
        ? serializeWelcomeMessageJob(updatedJob)
        : null,
    })
  } catch (error: any) {
    console.error('Error resending welcome message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resend welcome message' },
      { status: 500 }
    )
  }
}
