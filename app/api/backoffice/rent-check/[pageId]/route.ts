import { NextResponse } from 'next/server'
import { updateRentLogManualNote } from '@/lib/notion-rent-log'

export const dynamic = 'force-dynamic'

const PAGE_ID =
  /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
  request: Request,
  { params }: { params: { pageId: string } }
) {
  try {
    const pageId = params.pageId
    if (!PAGE_ID.test(pageId)) {
      return NextResponse.json({ error: 'Invalid rent entry' }, { status: 400 })
    }

    const body = await request.json()
    const manualNote = body?.manualNote
    if (typeof manualNote !== 'string') {
      return NextResponse.json({ error: 'Manual note is required' }, { status: 400 })
    }

    const saved = await updateRentLogManualNote(pageId, manualNote)
    return NextResponse.json({ id: pageId, manualNote: saved })
  } catch (error: any) {
    console.error('Error saving rent manual note:', error)
    const message = error.message || 'Failed to save manual note'
    const status = message === 'That entry is not in the rent log'
      ? 404
      : message.startsWith('Manual note must be')
        ? 400
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
