import {
  createWelcomeMessageJob,
  hasInboundWhatsAppMessages,
  insertWhatsAppMessage,
  markWelcomeMessageFailed,
  markWelcomeMessageSent,
  markWelcomeMessageSkipped,
  type WelcomeMessageJobRow,
} from '@/lib/db'
import { isLeadArchived } from '@/lib/notion'
import { normalizeUKPhone } from '@/lib/phone'
import { sendTemplateMessage } from '@/lib/whatsapp'

const DEFAULT_TEMPLATE_PREVIEW =
  "Hi {{1}}, thanks for reaching out about your {{2}} properties. {{3}} We'll be in touch shortly."

export function isWelcomeMessageEnabled(): boolean {
  return process.env.WELCOME_MESSAGE_ENABLED === 'true'
}

export function buildWelcomeTemplateParameters(job: WelcomeMessageJobRow): string[] {
  return [
    job.lead_name,
    job.property_count || 'your',
    job.extra_info || '',
  ]
}

export function renderWelcomeMessagePreview(parameters: string[]): string {
  const template =
    process.env.WHATSAPP_WELCOME_TEMPLATE_PREVIEW || DEFAULT_TEMPLATE_PREVIEW

  return template.replace(/\{\{(\d+)\}\}/g, (_, index: string) => {
    const parameterIndex = parseInt(index, 10) - 1
    return parameters[parameterIndex] ?? ''
  })
}

function getWelcomeTemplateConfig(): {
  templateName: string
  languageCode: string
} {
  const templateName = process.env.WHATSAPP_WELCOME_TEMPLATE_NAME
  if (!templateName) {
    throw new Error('WHATSAPP_WELCOME_TEMPLATE_NAME is not configured')
  }

  return {
    templateName,
    languageCode: process.env.WHATSAPP_WELCOME_TEMPLATE_LANGUAGE || 'en_GB',
  }
}

export async function processWelcomeMessageJob(
  job: WelcomeMessageJobRow
): Promise<'sent' | 'skipped' | 'failed'> {
  if (job.status !== 'pending') {
    return 'skipped'
  }

  const normalizedPhone = normalizeUKPhone(job.phone)
  if (!normalizedPhone) {
    await markWelcomeMessageSkipped({
      jobId: job.id,
      reason: 'Invalid phone number',
    })
    return 'skipped'
  }

  try {
    if (await isLeadArchived(job.notion_page_id)) {
      await markWelcomeMessageSkipped({
        jobId: job.id,
        reason: 'Lead archived in Notion',
      })
      return 'skipped'
    }

    if (await hasInboundWhatsAppMessages(normalizedPhone)) {
      await markWelcomeMessageSkipped({
        jobId: job.id,
        reason: 'Homeowner already sent a WhatsApp message',
      })
      return 'skipped'
    }

    const bodyParameters = buildWelcomeTemplateParameters(job)
    const previewBody = renderWelcomeMessagePreview(bodyParameters)
    const { templateName, languageCode } = getWelcomeTemplateConfig()

    const { messageId } = await sendTemplateMessage(normalizedPhone, {
      templateName,
      languageCode,
      bodyParameters,
    })

    await insertWhatsAppMessage({
      waMessageId: messageId,
      phone: normalizedPhone,
      direction: 'outbound',
      body: previewBody,
      notionPageId: job.notion_page_id,
      status: 'sent',
    })

    await markWelcomeMessageSent({
      jobId: job.id,
      waMessageId: messageId,
    })

    return 'sent'
  } catch (error: any) {
    const message = error?.message || 'Failed to send welcome message'
    console.error(`Welcome message job ${job.id} failed:`, message)
    await markWelcomeMessageFailed({
      jobId: job.id,
      error: message,
    })
    return 'failed'
  }
}

export async function sendWelcomeMessageForLead(params: {
  notionPageId: string
  phone: string
  leadName: string
  propertyCount: string | null
}): Promise<'sent' | 'skipped' | 'failed'> {
  const job = await createWelcomeMessageJob(params)
  if (!job) {
    return 'skipped'
  }

  return processWelcomeMessageJob(job)
}

export function serializeWelcomeMessageJob(job: WelcomeMessageJobRow) {
  return {
    id: job.id,
    notionPageId: job.notion_page_id,
    status: job.status,
    runAt: job.run_at.toISOString(),
    sentAt: job.sent_at?.toISOString() ?? null,
    error: job.error,
    previewBody:
      job.status === 'pending' || job.status === 'sent'
        ? renderWelcomeMessagePreview(buildWelcomeTemplateParameters(job))
        : null,
  }
}
