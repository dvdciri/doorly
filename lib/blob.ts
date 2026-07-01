import { put } from '@vercel/blob'

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/amr': 'amr',
}

export function mimeTypeToExtension(mimeType: string): string {
  const base = mimeType.split(';')[0].trim().toLowerCase()
  if (MIME_EXTENSION[base]) {
    return MIME_EXTENSION[base]
  }
  const subtype = base.split('/')[1]
  return subtype?.replace(/[^a-z0-9]/gi, '') || 'bin'
}

export function buildWhatsAppMediaPathname(
  phone: string,
  waMessageId: string,
  mimeType: string
): string {
  const phonePart = phone.replace(/\D/g, '')
  const safeMessageId = waMessageId.replace(/[^a-zA-Z0-9._-]/g, '_')
  const extension = mimeTypeToExtension(mimeType)
  return `whatsapp/${phonePart}/${safeMessageId}.${extension}`
}

export async function uploadWhatsAppMedia(
  pathname: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const result = await put(pathname, buffer, {
    access: 'private',
    contentType: mimeType,
    allowOverwrite: true,
  })
  return result.pathname
}
