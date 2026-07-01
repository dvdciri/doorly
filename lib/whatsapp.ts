import { normalizeUKPhone } from '@/lib/phone'

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v21.0'

function getPhoneNumberId(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!phoneNumberId) {
    throw new Error('WhatsApp phone number ID not configured')
  }
  return phoneNumberId
}

function getAccessToken(): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!token) {
    throw new Error('WhatsApp access token not configured')
  }
  return token
}

/**
 * Convert normalized UK phone (+447...) to WhatsApp API format (447...)
 */
export function toWhatsAppPhone(phone: string): string | null {
  const normalized = normalizeUKPhone(phone)
  if (!normalized) {
    return null
  }
  return normalized.replace('+', '')
}

/**
 * Convert WhatsApp webhook sender ID to normalized UK phone
 */
export function fromWhatsAppPhone(waPhone: string): string | null {
  const digits = waPhone.replace(/\D/g, '')
  if (digits.startsWith('44') && digits.length === 12) {
    return `+${digits}`
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return normalizeUKPhone(digits)
  }
  if (digits.length === 10 && digits.startsWith('7')) {
    return `+44${digits}`
  }
  return normalizeUKPhone(waPhone)
}

export async function sendTextMessage(toPhone: string, body: string): Promise<{
  messageId: string
}> {
  const waPhone = toWhatsAppPhone(toPhone)
  if (!waPhone) {
    throw new Error('Invalid phone number for WhatsApp')
  }

  const phoneNumberId = getPhoneNumberId()
  const response = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: waPhone,
      type: 'text',
      text: { body },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const messageId = data.messages?.[0]?.id
  if (!messageId) {
    throw new Error('WhatsApp API did not return a message ID')
  }

  return { messageId }
}

export type WhatsAppTemplateMessageOptions = {
  templateName: string
  languageCode: string
  bodyParameters: string[]
}

export async function sendTemplateMessage(
  toPhone: string,
  options: WhatsAppTemplateMessageOptions
): Promise<{ messageId: string }> {
  const waPhone = toWhatsAppPhone(toPhone)
  if (!waPhone) {
    throw new Error('Invalid phone number for WhatsApp')
  }

  const phoneNumberId = getPhoneNumberId()
  const components =
    options.bodyParameters.length > 0
      ? [
          {
            type: 'body',
            parameters: options.bodyParameters.map((text) => ({
              type: 'text',
              text,
            })),
          },
        ]
      : undefined

  const response = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: waPhone,
      type: 'template',
      template: {
        name: options.templateName,
        language: { code: options.languageCode },
        ...(components ? { components } : {}),
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const messageId = data.messages?.[0]?.id
  if (!messageId) {
    throw new Error('WhatsApp API did not return a message ID')
  }

  return { messageId }
}

export function verifyWebhookToken(token: string | null): boolean {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN
  return Boolean(expected && token === expected)
}

export async function markMessageAsRead(waMessageId: string): Promise<void> {
  const phoneNumberId = getPhoneNumberId()
  const response = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: waMessageId,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`WhatsApp mark read error: ${response.status} - ${errorText}`)
  }
}

export async function downloadWhatsAppMedia(mediaId: string): Promise<{
  buffer: Buffer
  mimeType: string
}> {
  const metaResponse = await fetch(`${WHATSAPP_API_BASE}/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })

  if (!metaResponse.ok) {
    const errorText = await metaResponse.text()
    throw new Error(`WhatsApp media metadata error: ${metaResponse.status} - ${errorText}`)
  }

  const meta = await metaResponse.json()
  const mediaUrl = meta.url as string | undefined
  const mimeType = (meta.mime_type as string | undefined) || 'application/octet-stream'

  if (!mediaUrl) {
    throw new Error('WhatsApp media metadata did not include a URL')
  }

  const fileResponse = await fetch(mediaUrl, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })

  if (!fileResponse.ok) {
    const errorText = await fileResponse.text()
    throw new Error(`WhatsApp media download error: ${fileResponse.status} - ${errorText}`)
  }

  const arrayBuffer = await fileResponse.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
  }
}
