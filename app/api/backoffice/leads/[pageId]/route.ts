import { NextResponse } from 'next/server'
import {
  archiveLead,
  getLead,
  getLeadComments,
  getLeadsDatabase,
  updateLeadStage,
} from '@/lib/notion'
import {
  deleteWhatsAppDataForPhone,
  deleteWelcomeMessageJobForNotionPage,
  getUnreadWhatsAppPhones,
  getWelcomeMessageJobByNotionPageId,
  getWhatsAppMediaPathnamesForPhone,
} from '@/lib/db'
import { deleteWhatsAppMediaBlobs } from '@/lib/blob'
import { normalizeUKPhone } from '@/lib/phone'
import { serializeWelcomeMessageJob } from '@/lib/welcome-message'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { pageId: string } }
) {
  try {
    const [lead, unreadPhones] = await Promise.all([
      getLead(params.pageId),
      getUnreadWhatsAppPhones(),
    ])

    let comments: Awaited<ReturnType<typeof getLeadComments>> = []
    let commentsError: string | null = null

    try {
      comments = await getLeadComments(params.pageId)
    } catch (error: any) {
      console.error('Error fetching Notion comments:', error)
      commentsError =
        error.message ||
        'Failed to load comments from Notion. Ensure your integration has Read comments capability.'
    }

    const normalizedPhone = lead.phone ? normalizeUKPhone(lead.phone) : null
    const unread = normalizedPhone
      ? unreadPhones.find((item) => item.phone === normalizedPhone)
      : undefined
    const welcomeMessageJob = await getWelcomeMessageJobByNotionPageId(params.pageId)

    return NextResponse.json({
      lead: {
        ...lead,
        phone: normalizedPhone || lead.phone,
        unreadCount: unread?.unreadCount || 0,
      },
      comments,
      commentsError,
      welcomeMessage: welcomeMessageJob
        ? serializeWelcomeMessageJob(welcomeMessageJob)
        : null,
    })
  } catch (error: any) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch lead' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { pageId: string } }
) {
  try {
    const body = await request.json()
    const { stage } = body

    if (!stage || typeof stage !== 'string' || !stage.trim()) {
      return NextResponse.json({ error: 'Stage is required' }, { status: 400 })
    }

    if (stage === 'Unassigned') {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const { stages } = await getLeadsDatabase()
    if (!stages.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    await updateLeadStage(params.pageId, stage)
    const lead = await getLead(params.pageId)
    const normalizedPhone = lead.phone ? normalizeUKPhone(lead.phone) : null

    return NextResponse.json({
      lead: {
        ...lead,
        phone: normalizedPhone || lead.phone,
      },
    })
  } catch (error: any) {
    console.error('Error updating lead stage:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update lead stage' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { pageId: string } }
) {
  try {
    const lead = await getLead(params.pageId)
    const normalizedPhone = lead.phone ? normalizeUKPhone(lead.phone) : null

    if (normalizedPhone) {
      const pathnames = await getWhatsAppMediaPathnamesForPhone(normalizedPhone)
      await deleteWhatsAppDataForPhone(normalizedPhone)
      await deleteWhatsAppMediaBlobs(pathnames)
    }

    await deleteWelcomeMessageJobForNotionPage(params.pageId)
    await archiveLead(params.pageId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
