import { NextResponse } from 'next/server'
import { addCommentToNotionPage } from '@/lib/notion'
import { query, initializePortfolioDatabase } from '@/lib/db'

export async function POST(request: Request) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set')
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { notionPageId, comment, submissionId } = body

    // Validate required fields
    if (!comment) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
      )
    }

    // Validate comment is not empty after trimming
    const trimmedComment = comment.trim()
    if (!trimmedComment) {
      return NextResponse.json(
        { error: 'Comment cannot be empty' },
        { status: 400 }
      )
    }

    // Update database record if submissionId is provided
    if (submissionId) {
      try {
        // Ensure table exists before updating
        await initializePortfolioDatabase()
        
        await query(
          `UPDATE portfolio_submission 
           SET additional_info = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [trimmedComment, submissionId]
        )
      } catch (dbError: any) {
        // Log error but don't fail the entire operation
        console.error('Failed to update database with additional info:', dbError.message || dbError)
      }
    }

    // Add comment to Notion page if notionPageId is provided
    if (notionPageId) {
      try {
        await addCommentToNotionPage(notionPageId, trimmedComment)
      } catch (notionError: any) {
        // Log error but don't fail the entire operation
        console.error('Failed to add comment to Notion:', notionError.message || notionError)
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
    console.error('Error adding portfolio comment:', error)
    
    return NextResponse.json(
      { error: 'Failed to save additional information. Please try again later.' },
      { status: 500 }
    )
  }
}
