import { NextResponse } from 'next/server'
import { addCommentToNotionPage } from '@/lib/notion'

export async function POST(
  request: Request,
  { params }: { params: { pageId: string } }
) {
  try {
    const body = await request.json()
    const { comment } = body

    if (!comment || !comment.trim()) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
      )
    }

    await addCommentToNotionPage(params.pageId, comment.trim())

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error adding comment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add comment' },
      { status: 500 }
    )
  }
}
