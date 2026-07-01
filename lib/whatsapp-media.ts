import {
  buildWhatsAppMediaPathname,
  uploadWhatsAppMedia,
} from '@/lib/blob'
import { downloadWhatsAppMedia } from '@/lib/whatsapp'
import type { WhatsAppMessageType } from '@/lib/db'

const MEDIA_LABELS: Record<Exclude<WhatsAppMessageType, 'text'>, string> = {
  image: '[Image]',
  video: '[Video]',
  audio: '[Audio]',
}

export function mediaBodyLabel(
  messageType: WhatsAppMessageType,
  caption?: string | null
): string {
  if (caption?.trim()) {
    return caption.trim()
  }
  if (messageType === 'text') {
    return ''
  }
  return MEDIA_LABELS[messageType]
}

export async function cacheWhatsAppMediaToBlob(
  phone: string,
  waMessageId: string,
  waMediaId: string,
  mimeType?: string | null
): Promise<{ pathname: string; mimeType: string } | null> {
  try {
    const downloaded = await downloadWhatsAppMedia(waMediaId)
    const resolvedMime = mimeType || downloaded.mimeType
    const pathname = buildWhatsAppMediaPathname(phone, waMessageId, resolvedMime)
    const storedPathname = await uploadWhatsAppMedia(
      pathname,
      downloaded.buffer,
      resolvedMime
    )
    return { pathname: storedPathname, mimeType: resolvedMime }
  } catch (error) {
    console.error('Failed to cache WhatsApp media to blob:', error)
    return null
  }
}
