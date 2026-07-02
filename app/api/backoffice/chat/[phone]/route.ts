import { NextResponse } from 'next/server'
import {
  getWhatsAppContact,
  getWhatsAppMessages,
  insertWhatsAppMessage,
} from '@/lib/db'
import { sendTextMessage, formatWhatsAppError, logWhatsApp, logWhatsAppError } from '@/lib/whatsapp'
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
        statusError: message.status_error,
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

    const trimmedMessage = message.trim()
    logWhatsApp('backoffice send attempt', {
      phone,
      notionPageId: notionPageId || null,
      bodyLength: trimmedMessage.length,
    })

    try {
      const { messageId } = await sendTextMessage(phone, trimmedMessage)

      const storedMessage = await insertWhatsAppMessage({
        waMessageId: messageId,
        phone,
        direction: 'outbound',
        body: trimmedMessage,
        notionPageId: notionPageId || null,
        status: 'sent',
      })

      logWhatsApp('backoffice send stored as sent', {
        phone,
        messageId,
        dbMessageId: storedMessage.id,
      })

      return NextResponse.json({
        success: true,
        messageId,
        message: {
          id: storedMessage.id,
          direction: storedMessage.direction,
          body: storedMessage.body,
          timestamp: new Date(storedMessage.wa_timestamp).toISOString(),
          status: storedMessage.status,
          statusError: storedMessage.status_error,
        },
      })
    } catch (error) {
      const statusError = formatWhatsAppError(error)
      logWhatsAppError('backoffice send failed', {
        phone,
        notionPageId: notionPageId || null,
        statusError,
        error,
      })

      const storedMessage = await insertWhatsAppMessage({
        phone,
        direction: 'outbound',
        body: trimmedMessage,
        notionPageId: notionPageId || null,
        status: 'failed',
        statusError,
      })

      logWhatsAppError('backoffice send stored as failed', {
        phone,
        dbMessageId: storedMessage.id,
        statusError: storedMessage.status_error,
      })

      return NextResponse.json(
        {
          success: false,
          error: statusError,
          message: {
            id: storedMessage.id,
            direction: storedMessage.direction,
            body: storedMessage.body,
            timestamp: new Date(storedMessage.wa_timestamp).toISOString(),
            status: storedMessage.status,
            statusError: storedMessage.status_error,
          },
        },
        { status: 502 }
      )
    }
  } catch (error: any) {
    console.error('Error sending chat message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
