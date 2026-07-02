import {
  fromChatMessages,
  OpenRouter,
  stepCountIs,
  tool,
} from '@openrouter/agent'
import type { Item } from '@openrouter/agent'
import type { ChatMessages } from '@openrouter/sdk/models'
import { z } from 'zod'
import {
  getLatestNotionPageIdForPhone,
  getWelcomeMessageJobByPhone,
  getWhatsAppAgentState,
  getWhatsAppMessages,
  insertWhatsAppMessage,
  markAgentCompleted,
  scheduleAgentRun,
  type WhatsAppMessageRow,
} from '@/lib/db'
import {
  getLead,
  isLeadArchived,
  updateLeadPropertyAddress,
} from '@/lib/notion'
import { sendTextMessage, formatWhatsAppError, logWhatsAppError } from '@/lib/whatsapp'

export function isWhatsAppAgentEnabled(): boolean {
  return process.env.WHATSAPP_AGENT_ENABLED === 'true'
}

function getDebounceSeconds(): number {
  const parsed = Number.parseInt(
    process.env.WHATSAPP_AGENT_DEBOUNCE_SECONDS || '10',
    10
  )
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10
}

function getOpenRouterModel(): string {
  const model = process.env.OPENROUTER_MODEL
  if (!model) {
    throw new Error('OPENROUTER_MODEL is not configured')
  }
  return model
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatAddresses(
  addresses: Array<{
    houseNumber: string
    streetName: string
    postcode: string
  }>
): string {
  return addresses
    .map(
      (address) =>
        `${address.houseNumber} ${address.streetName}, ${address.postcode}`
    )
    .join('\n')
}

function buildSystemPrompt(lead: {
  name: string
  propertyCount: string | null
  extraInformation: string | null
  propertyAddress: string | null
}): string {
  const propertyCountLine = lead.propertyCount
    ? `The lead indicated they have ${lead.propertyCount} propert${lead.propertyCount === '1' ? 'y' : 'ies'}.`
    : 'The number of properties is unknown — ask the lead how many properties they have if needed.'

  const extraInfoLine = lead.extraInformation
    ? `Additional information from the lead: ${lead.extraInformation}`
    : 'No additional information was provided.'

  const existingAddressLine = lead.propertyAddress
    ? `Property address already on file (may be partial): ${lead.propertyAddress}`
    : 'No property address has been saved yet.'

  return `You are a friendly WhatsApp assistant for Doorly, helping collect property addresses from leads.

## Lead context
- Lead name: ${lead.name}
- ${propertyCountLine}
- ${extraInfoLine}
- ${existingAddressLine}

## Checklist (must complete before stopping)
For each property, collect a full UK address with all three components:
1. House number (or flat/unit number if applicable)
2. Street name
3. Postcode

## Rules
- Ask clear, concise follow-up questions when any component is missing.
- If the lead owns multiple properties, collect a complete address for each one before finishing.
- Do not call save_property_addresses until every required address has house number, street name, and postcode.
- Once save_property_addresses succeeds, do not send any closing or farewell message — stop immediately with no further reply.
- Keep messages short and conversational, suitable for WhatsApp.
- Only discuss collecting property addresses; do not discuss other topics.`
}

function buildConversationMessages(
  messages: WhatsAppMessageRow[]
): ChatMessages[] {
  return messages
    .filter((message) => (message.message_type || 'text') === 'text')
    .map((message) => ({
      role: message.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: message.body,
    }))
}

async function canInvokeAgent(phone: string): Promise<{
  eligible: boolean
  notionPageId: string | null
}> {
  if (!isWhatsAppAgentEnabled()) {
    return { eligible: false, notionPageId: null }
  }

  const welcomeJob = await getWelcomeMessageJobByPhone(phone)

  // TODO: Re-enable once WhatsApp Business template sending is verified.
  // Require welcome template to have been sent before the agent engages.
  // if (!welcomeJob || welcomeJob.status !== 'sent') {
  //   return { eligible: false, notionPageId: null }
  // }

  const notionPageId =
    welcomeJob?.notion_page_id ?? (await getLatestNotionPageIdForPhone(phone))
  if (!notionPageId) {
    return { eligible: false, notionPageId: null }
  }

  const agentState = await getWhatsAppAgentState(phone)
  if (agentState?.status === 'completed') {
    return { eligible: false, notionPageId: null }
  }

  if (await isLeadArchived(notionPageId)) {
    return { eligible: false, notionPageId: null }
  }

  return { eligible: true, notionPageId }
}

export async function processDebouncedAgentRun(
  phone: string,
  generation: number
): Promise<void> {
  const state = await getWhatsAppAgentState(phone)
  if (!state || state.generation !== generation || state.status === 'completed') {
    return
  }

  const waitMs = state.process_after.getTime() - Date.now()
  if (waitMs > 0) {
    await sleep(waitMs)
  }

  const stateAfterWait = await getWhatsAppAgentState(phone)
  if (
    !stateAfterWait ||
    stateAfterWait.generation !== generation ||
    stateAfterWait.status === 'completed'
  ) {
    return
  }

  await runWhatsAppAgent(phone, stateAfterWait.notion_page_id)
}

export async function runWhatsAppAgent(
  phone: string,
  notionPageId: string
): Promise<void> {
  const lead = await getLead(notionPageId)
  if (await isLeadArchived(notionPageId)) {
    return
  }

  const messages = await getWhatsAppMessages(phone)
  const conversationMessages = buildConversationMessages(messages)
  if (conversationMessages.length === 0) {
    return
  }

  let addressesSaved = false

  const savePropertyAddressesTool = tool({
    name: 'save_property_addresses',
    description:
      'Save verified full UK property addresses to Notion once all required addresses are collected',
    inputSchema: z.object({
      addresses: z
        .array(
          z.object({
            houseNumber: z.string().min(1),
            streetName: z.string().min(1),
            postcode: z.string().min(1),
          })
        )
        .min(1),
    }),
    execute: async ({ addresses }) => {
      const formatted = formatAddresses(addresses)
      await updateLeadPropertyAddress(notionPageId, formatted)
      await markAgentCompleted(phone)
      addressesSaved = true
      return { success: true, savedAddresses: formatted }
    },
  })

  const client = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  })

  const chatMessages: ChatMessages[] = conversationMessages

  const result = client.callModel({
    model: getOpenRouterModel(),
    instructions: buildSystemPrompt(lead),
    input: fromChatMessages(chatMessages) as Item[],
    tools: [savePropertyAddressesTool],
    stopWhen: stepCountIs(5),
  })

  const replyText = (await result.getText()).trim()

  if (addressesSaved) {
    return
  }

  if (!replyText) {
    return
  }

  try {
    const { messageId } = await sendTextMessage(phone, replyText)
    await insertWhatsAppMessage({
      waMessageId: messageId,
      phone,
      direction: 'outbound',
      body: replyText,
      notionPageId,
      status: 'sent',
    })
  } catch (error) {
    const statusError = formatWhatsAppError(error)
    logWhatsAppError('agent send failed', {
      phone,
      notionPageId,
      statusError,
      replyLength: replyText.length,
      error,
    })
    const storedMessage = await insertWhatsAppMessage({
      phone,
      direction: 'outbound',
      body: replyText,
      notionPageId,
      status: 'failed',
      statusError,
    })
    logWhatsAppError('agent send stored as failed', {
      phone,
      dbMessageId: storedMessage.id,
      statusError: storedMessage.status_error,
    })
  }
}

export async function scheduleInboundAgentIfEligible(
  phone: string
): Promise<number | null> {
  const { eligible, notionPageId } = await canInvokeAgent(phone)
  if (!eligible || !notionPageId) {
    return null
  }

  const scheduled = await scheduleAgentRun(
    phone,
    notionPageId,
    getDebounceSeconds()
  )
  return scheduled?.generation ?? null
}
