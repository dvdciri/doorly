import { NextResponse } from 'next/server'
import { getLead, getLeadComments } from '@/lib/notion'
import { getUnreadWhatsAppPhones } from '@/lib/db'
import { normalizeUKPhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { pageId: string } }
) {
  try {
    const [lead, unreadPhones] = await Promise.all([
      getLead(params.pageId),
      getUnreadWhatsAppPhones(),
    ])

    let comments: Awaited<ReturnType<typeof getLeadComments>> = []
    let commentsError: string | null = null

    try {
      comments = await getLeadComments(params.pageId)
    } catch (error: any) {
      console.error('Error fetching Notion comments:', error)
      commentsError =
        error.message ||
        'Failed to load comments from Notion. Ensure your integration has Read comments capability.'
    }

    const normalizedPhone = lead.phone ? normalizeUKPhone(lead.phone) : null
    const unread = normalizedPhone
      ? unreadPhones.find((item) => item.phone === normalizedPhone)
      : undefined

    return NextResponse.json({
      lead: {
        ...lead,
        phone: normalizedPhone || lead.phone,
        unreadCount: unread?.unreadCount || 0,
      },
      comments,
      commentsError,
    })
  } catch (error: any) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch lead' },
      { status: 500 }
    )
  }
}
