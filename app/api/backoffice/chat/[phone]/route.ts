import { NextResponse } from 'next/server'
import {
  getWhatsAppMessages,
  insertWhatsAppMessage,
  markWhatsAppRead,
} from '@/lib/db'
import { sendTextMessage } from '@/lib/whatsapp'
import { normalizeUKPhone } from '@/lib/phone'

function decodePhoneParam(encoded: string): string | null {
  try {
    const decoded = decodeURIComponent(encoded)
    return normalizeUKPhone(decoded)
  } catch {
    return normalizeUKPhone(encoded)
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { phone: string } }
) {
  try {
    const phone = decodePhoneParam(params.phone)
    if (!phone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const messages = await getWhatsAppMessages(phone)

    return NextResponse.json({
      phone,
      messages: messages.map((message) => ({
        id: message.id,
        waMessageId: message.wa_message_id,
        direction: message.direction,
        body: message.body,
        timestamp: message.wa_timestamp,
      })),
    })
  } catch (error: any) {
    console.error('Error fetching chat messages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { phone: string } }
) {
  try {
    const phone = decodePhoneParam(params.phone)
    if (!phone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const body = await request.json()
    const { message, notionPageId } = body

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const { messageId } = await sendTextMessage(phone, message.trim())

    await insertWhatsAppMessage({
      waMessageId: messageId,
      phone,
      direction: 'outbound',
      body: message.trim(),
      waTimestamp: new Date(),
      notionPageId: notionPageId || null,
    })

    return NextResponse.json({ success: true, messageId })
  } catch (error: any) {
    console.error('Error sending chat message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
