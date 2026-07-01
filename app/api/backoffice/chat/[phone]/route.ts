import { NextResponse } from 'next/server'
import {
  getWhatsAppContact,
  getWhatsAppMessages,
  insertWhatsAppMessage,
} from '@/lib/db'
import { sendTextMessage } from '@/lib/whatsapp'
import { normalizeUKPhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'

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

    const [messages, contact] = await Promise.all([
      getWhatsAppMessages(phone),
      getWhatsAppContact(phone),
    ])

    return NextResponse.json({
      phone,
      contact: {
        phone,
        waProfileName: contact?.wa_profile_name || null,
      },
      messages: messages.map((message) => ({
        id: message.id,
        waMessageId: message.wa_message_id,
        direction: message.direction,
        body: message.body,
        timestamp: new Date(message.wa_timestamp).toISOString(),
        status: message.status,
        statusAt: message.status_at
          ? new Date(message.status_at).toISOString()
          : null,
        messageType: message.message_type || 'text',
        mediaMimeType: message.media_mime_type,
        hasMedia: Boolean(message.media_blob_pathname || message.wa_media_id),
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
      notionPageId: notionPageId || null,
      status: 'sent',
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
