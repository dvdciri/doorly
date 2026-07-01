import { NextResponse } from 'next/server'
import { updateLeadExtraInformation } from '@/lib/notion'
import { query, initializePortfolioDatabase } from '@/lib/db'

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set')
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { notionPageId, comment, submissionId } = body

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
      )
    }

    const trimmedComment = comment.trim()
    if (!trimmedComment) {
      return NextResponse.json(
        { error: 'Comment cannot be empty' },
        { status: 400 }
      )
    }

    if (submissionId) {
      try {
        await initializePortfolioDatabase()

        await query(
          `UPDATE portfolio_submission 
           SET additional_info = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [trimmedComment, submissionId]
        )
      } catch (dbError: any) {
        console.error('Failed to update database with additional info:', dbError.message || dbError)
      }
    }

    if (notionPageId) {
      try {
        await updateLeadExtraInformation(notionPageId, trimmedComment)
      } catch (notionError: any) {
        console.error('Failed to update Notion extra information:', notionError.message || notionError)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Additional information saved successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error adding portfolio extra information:', error)

    return NextResponse.json(
      { error: 'Failed to save additional information. Please try again later.' },
      { status: 500 }
    )
  }
}
