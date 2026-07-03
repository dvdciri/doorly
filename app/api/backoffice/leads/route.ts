import { NextResponse } from 'next/server'
import {
  getLeadsDatabase,
  queryLeads,
  groupLeadsByStage,
} from '@/lib/notion'
import { normalizeUKPhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [{ stages }, leads] = await Promise.all([
      getLeadsDatabase(),
      queryLeads(),
    ])

    const normalizedLeads = leads.map((lead) => ({
      ...lead,
      phone: lead.phone ? normalizeUKPhone(lead.phone) || lead.phone : lead.phone,
    }))

    const columns = groupLeadsByStage(normalizedLeads, stages)

    return NextResponse.json({
      stages,
      columns,
      leads: normalizedLeads,
    })
  } catch (error: any) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}
