import { NextResponse } from 'next/server'
import {
  getLeadsDatabase,
  queryLeads,
  groupLeadsByStage,
} from '@/lib/notion'
import { getUnreadWhatsAppPhones } from '@/lib/db'
import { normalizeUKPhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [{ stages }, leads, unreadPhones] = await Promise.all([
      getLeadsDatabase(),
      queryLeads(),
      getUnreadWhatsAppPhones(),
    ])

    const unreadByPhone = new Map(
      unreadPhones.map((item) => [item.phone, item])
    )

    const leadsWithUnread = leads.map((lead) => {
      const normalizedPhone = lead.phone ? normalizeUKPhone(lead.phone) : null
      const unread = normalizedPhone ? unreadByPhone.get(normalizedPhone) : undefined
      return {
        ...lead,
        phone: normalizedPhone || lead.phone,
        unreadCount: unread?.unreadCount || 0,
      }
    })

    const columns = groupLeadsByStage(leadsWithUnread, stages).map((column) => ({
      ...column,
      leads: column.leads.map((lead) => ({
        ...lead,
        unreadCount:
          (lead as typeof lead & { unreadCount?: number }).unreadCount || 0,
      })),
    }))

    return NextResponse.json({
      stages,
      columns,
      leads: leadsWithUnread,
    })
  } catch (error: any) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}
