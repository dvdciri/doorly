import { NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import {
  getWhatsAppMessageById,
  updateWhatsAppMessageMedia,
} from '@/lib/db'
import { cacheWhatsAppMediaToBlob } from '@/lib/whatsapp-media'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const id = Number(params.messageId)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 })
    }

    const message = await getWhatsAppMessageById(id)
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const hasMedia =
      Boolean(message.media_blob_pathname) || Boolean(message.wa_media_id)
    if (!hasMedia) {
      return NextResponse.json({ error: 'No media for message' }, { status: 404 })
    }

    let pathname = message.media_blob_pathname
    let mimeType = message.media_mime_type || 'application/octet-stream'

    if (!pathname && message.wa_media_id && message.wa_message_id) {
      const cached = await cacheWhatsAppMediaToBlob(
        message.phone,
        message.wa_message_id,
        message.wa_media_id,
        message.media_mime_type
      )
      if (!cached) {
        return NextResponse.json({ error: 'Media unavailable' }, { status: 502 })
      }
      pathname = cached.pathname
      mimeType = cached.mimeType
      await updateWhatsAppMessageMedia(message.id, pathname, mimeType)
    }

    if (!pathname) {
      return NextResponse.json({ error: 'Media unavailable' }, { status: 404 })
    }

    const blob = await get(pathname, { access: 'private' })
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    return new NextResponse(blob.stream, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error('Error streaming chat media:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load media' },
      { status: 500 }
    )
  }
}
