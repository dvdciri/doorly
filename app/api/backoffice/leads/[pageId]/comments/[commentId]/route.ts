import { NextResponse } from 'next/server'
import { deleteNotionComment } from '@/lib/notion'

export async function DELETE(
  _request: Request,
  { params }: { params: { pageId: string; commentId: string } }
) {
  try {
    await deleteNotionComment(params.commentId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting comment:', error)

    const message = error.message || ''
    if (message.includes('404')) {
      return NextResponse.json(
        {
          error:
            'This comment cannot be deleted from the backoffice. Only comments created by the integration can be removed.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
