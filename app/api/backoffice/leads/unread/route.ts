import { NextResponse } from 'next/server'
import { queryLeads } from '@/lib/notion'
import { getUnreadWhatsAppPhones } from '@/lib/db'
import { normalizeUKPhone } from '@/lib/phone'

export async function GET() {
  try {
    const [leads, unreadPhones] = await Promise.all([
      queryLeads(),
      getUnreadWhatsAppPhones(),
    ])

    const leadByPhone = new Map<string, (typeof leads)[0]>()
    for (const lead of leads) {
      if (lead.phone) {
        const normalized = normalizeUKPhone(lead.phone)
        if (normalized) {
          leadByPhone.set(normalized, lead)
        }
      }
    }

    const unreadLeads = unreadPhones
      .map((item) => {
        const lead = leadByPhone.get(item.phone)
        return {
          phone: item.phone,
          unreadCount: item.unreadCount,
          lastMessageAt: item.lastMessageAt,
          lastMessageBody: item.lastMessageBody,
          lead: lead
            ? {
                id: lead.id,
                name: lead.name,
                stage: lead.stage,
              }
            : null,
        }
      })
      .filter((item) => item.lead !== null)

    return NextResponse.json({ unread: unreadLeads })
  } catch (error: any) {
    console.error('Error fetching unread leads:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unread leads' },
      { status: 500 }
    )
  }
}
