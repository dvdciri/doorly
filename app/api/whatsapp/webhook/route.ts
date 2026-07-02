import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import {
  insertWhatsAppMessage,
  updateWhatsAppMessageStatus,
  upsertWhatsAppContact,
} from '@/lib/db'
import type { WhatsAppMessageType } from '@/lib/db'
import { fromWhatsAppPhone, verifyWebhookToken, formatWebhookStatusFailure, logWhatsApp, logWhatsAppError } from '@/lib/whatsapp'
import { cacheWhatsAppMediaToBlob, mediaBodyLabel } from '@/lib/whatsapp-media'
import {
  isWhatsAppAgentEnabled,
  processDebouncedAgentRun,
  scheduleInboundAgentIfEligible,
} from '@/lib/whatsapp-agent'

function buildContactNameMap(contacts: any[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const contact of contacts) {
    const name = contact.profile?.name
    if (contact.wa_id && name) {
      map.set(contact.wa_id, name)
    }
  }
  return map
}

type InboundMessagePayload = {
  messageType: WhatsAppMessageType
  body: string
  mediaId?: string
  mediaMimeType?: string | null
}

function parseInboundMessage(message: any): InboundMessagePayload | null {
  if (message.type === 'text' && message.text?.body) {
    return {
      messageType: 'text',
      body: message.text.body,
    }
  }

  if (message.type === 'image' && message.image?.id) {
    return {
      messageType: 'image',
      body: mediaBodyLabel('image', message.image.caption),
      mediaId: message.image.id,
      mediaMimeType: message.image.mime_type || null,
    }
  }

  if (message.type === 'video' && message.video?.id) {
    return {
      messageType: 'video',
      body: mediaBodyLabel('video', message.video.caption),
      mediaId: message.video.id,
      mediaMimeType: message.video.mime_type || null,
    }
  }

  if (message.type === 'audio' && message.audio?.id) {
    return {
      messageType: 'audio',
      body: mediaBodyLabel('audio'),
      mediaId: message.audio.id,
      mediaMimeType: message.audio.mime_type || null,
    }
  }

  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && verifyWebhookToken(token)) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value
        if (!value) {
          continue
        }

        const contactNames = buildContactNameMap(value.contacts || [])

        for (const message of value.messages || []) {
          const parsed = parseInboundMessage(message)
          if (!parsed) {
            continue
          }

          const phone = fromWhatsAppPhone(message.from)
          if (!phone) {
            console.error('Could not normalize WhatsApp phone:', message.from)
            continue
          }

          const profileName = contactNames.get(message.from) || null
          if (profileName) {
            await upsertWhatsAppContact(phone, profileName)
          }

          let mediaBlobPathname: string | null = null
          let mediaMimeType = parsed.mediaMimeType || null

          if (parsed.mediaId && message.id) {
            const cached = await cacheWhatsAppMediaToBlob(
              phone,
              message.id,
              parsed.mediaId,
              parsed.mediaMimeType
            )
            if (cached) {
              mediaBlobPathname = cached.pathname
              mediaMimeType = cached.mimeType
            }
          }

          await insertWhatsAppMessage({
            waMessageId: message.id,
            phone,
            direction: 'inbound',
            body: parsed.body,
            waTimestamp: Number(message.timestamp),
            messageType: parsed.messageType,
            mediaMimeType,
            waMediaId: parsed.mediaId || null,
            mediaBlobPathname,
          })

          if (parsed.messageType === 'text' && isWhatsAppAgentEnabled()) {
            const generation = await scheduleInboundAgentIfEligible(phone)
            if (generation !== null) {
              waitUntil(processDebouncedAgentRun(phone, generation))
            }
          }
        }

        for (const status of value.statuses || []) {
          if (!status.id || !status.status) {
            continue
          }

          const statusAt = Number(status.timestamp)
          const statusError = formatWebhookStatusFailure(status)

          if (status.status === 'failed') {
            logWhatsAppError('webhook delivery failed', {
              waMessageId: status.id,
              recipientId: status.recipient_id,
              statusError,
              errors: status.errors,
              rawStatus: status,
            })
          } else {
            logWhatsApp('webhook status update', {
              waMessageId: status.id,
              status: status.status,
              recipientId: status.recipient_id,
            })
          }

          await updateWhatsAppMessageStatus(
            status.id,
            status.status,
            statusAt,
            statusError
          )
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ success: true })
  }
}
