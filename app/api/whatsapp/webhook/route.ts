import { NextResponse } from 'next/server'
import { insertWhatsAppMessage } from '@/lib/db'
import { fromWhatsAppPhone, verifyWebhookToken } from '@/lib/whatsapp'

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
        if (!value?.messages) {
          continue
        }

        for (const message of value.messages) {
          if (message.type !== 'text' || !message.text?.body) {
            continue
          }

          const phone = fromWhatsAppPhone(message.from)
          if (!phone) {
            console.error('Could not normalize WhatsApp phone:', message.from)
            continue
          }

          const timestamp = new Date(Number(message.timestamp) * 1000)

          await insertWhatsAppMessage({
            waMessageId: message.id,
            phone,
            direction: 'inbound',
            body: message.text.body,
            waTimestamp: timestamp,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ success: true })
  }
}
