import {
  createWelcomeMessageJob,
  getWelcomeMessageJobByNotionPageId,
  hasInboundWhatsAppMessages,
  insertWhatsAppMessage,
  markWelcomeMessageFailed,
  markWelcomeMessageSent,
  markWelcomeMessageSkipped,
  resetWelcomeMessageJobForRetry,
  type WelcomeMessageJobRow,
} from '@/lib/db'
import { isLeadArchived } from '@/lib/notion'
import { normalizeUKPhone } from '@/lib/phone'
import { sendTemplateMessage } from '@/lib/whatsapp'

export type WelcomeTemplateVariables = {
  name: string
  n_of_properties: string
}

export function isWelcomeMessageEnabled(): boolean {
  return process.env.WELCOME_MESSAGE_ENABLED === 'true'
}

export function getFirstName(fullName: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) {
    return ''
  }
  return trimmed.split(/\s+/)[0]
}

export function buildWelcomeTemplateVariables(
  job: WelcomeMessageJobRow
): WelcomeTemplateVariables {
  return {
    name: getFirstName(job.lead_name),
    n_of_properties: job.property_count || 'some',
  }
}

/** Body parameters in template order: name, then n_of_properties */
export function buildWelcomeTemplateParameters(job: WelcomeMessageJobRow): string[] {
  const { name, n_of_properties } = buildWelcomeTemplateVariables(job)
  return [name, n_of_properties]
}

export function renderWelcomeMessagePreview(
  variables: WelcomeTemplateVariables
): string | null {
  const template = process.env.WHATSAPP_WELCOME_TEMPLATE_PREVIEW
  if (!template) {
    return null
  }

  return template
    .replace(/\{\{name\}\}/g, variables.name)
    .replace(/\{\{n_of_properties\}\}/g, variables.n_of_properties)
}

function formatWelcomeMessageRecord(
  templateName: string,
  variables: WelcomeTemplateVariables
): string {
  return `[${templateName}] name=${variables.name}, n_of_properties=${variables.n_of_properties}`
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

    const variables = buildWelcomeTemplateVariables(job)
    const { templateName, languageCode } = getWelcomeTemplateConfig()
    const previewBody =
      renderWelcomeMessagePreview(variables) ??
      formatWelcomeMessageRecord(templateName, variables)

    const { messageId } = await sendTemplateMessage(normalizedPhone, {
      templateName,
      languageCode,
      bodyParameters: buildWelcomeTemplateParameters(job),
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

export async function retryWelcomeMessage(
  notionPageId: string
): Promise<'sent' | 'skipped' | 'failed' | 'not_found' | 'not_retryable'> {
  const job = await getWelcomeMessageJobByNotionPageId(notionPageId)
  if (!job) {
    return 'not_found'
  }
  if (job.status !== 'failed') {
    return 'not_retryable'
  }

  const resetJob = await resetWelcomeMessageJobForRetry(job.id)
  if (!resetJob) {
    return 'not_retryable'
  }

  return processWelcomeMessageJob(resetJob)
}

export function serializeWelcomeMessageJob(job: WelcomeMessageJobRow) {
  const variables = buildWelcomeTemplateVariables(job)

  return {
    id: job.id,
    notionPageId: job.notion_page_id,
    status: job.status,
    runAt: job.run_at.toISOString(),
    sentAt: job.sent_at?.toISOString() ?? null,
    error: job.error,
    previewBody:
      job.status === 'pending' || job.status === 'sent' || job.status === 'failed'
        ? renderWelcomeMessagePreview(variables)
        : null,
  }
}
