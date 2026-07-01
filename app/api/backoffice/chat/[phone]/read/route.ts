import { NextResponse } from 'next/server'
import { getUnreadInboundMessageIds, markWhatsAppRead } from '@/lib/db'
import { markMessageAsRead } from '@/lib/whatsapp'
import { normalizeUKPhone } from '@/lib/phone'

export async function POST(
  _request: Request,
  { params }: { params: { phone: string } }
) {
  try {
    const decoded = decodeURIComponent(params.phone)
    const phone = normalizeUKPhone(decoded)
    if (!phone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const unreadMessageIds = await getUnreadInboundMessageIds(phone)

    for (const messageId of unreadMessageIds) {
      try {
        await markMessageAsRead(messageId)
      } catch (error) {
        console.error('Failed to mark WhatsApp message as read:', messageId, error)
      }
    }

    await markWhatsAppRead(phone)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error marking chat as read:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to mark as read' },
      { status: 500 }
    )
  }
}
