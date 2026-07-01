const NOTION_API_VERSION = '2022-06-28'
const NOTION_API_BASE = 'https://api.notion.com/v1'

export interface Lead {
  id: string
  name: string
  stage: string | null
  phone: string | null
  leadSource: string | null
  addedDate: string | null
  propertyCount: string | null
  extraInformation: string | null
  url: string
}

export interface NotionComment {
  id: string
  text: string
  createdTime: string
  createdBy: string | null
}

function getNotionHeaders(): HeadersInit {
  if (!process.env.NOTION_TOKEN) {
    throw new Error('Notion credentials not configured')
  }

  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_API_VERSION,
  }
}

function getDatabaseId(): string {
  const databaseId = process.env.NOTION_DATABASE_ID || '2a206b45-463e-8113-83db-000b5fe676d0'
  if (!databaseId) {
    throw new Error('Notion database ID not configured')
  }
  return databaseId
}

function extractRichText(property: any): string | null {
  if (!property?.rich_text?.length) {
    return null
  }
  return property.rich_text.map((item: any) => item.plain_text || '').join('').trim() || null
}

function extractTitle(property: any): string | null {
  if (!property?.title?.length) {
    return null
  }
  return property.title.map((item: any) => item.plain_text || '').join('').trim() || null
}

function extractSelect(property: any): string | null {
  return property?.select?.name ?? null
}

function extractDate(property: any): string | null {
  return property?.date?.start ?? null
}

export function parseLeadFromPage(page: any): Lead {
  const properties = page.properties || {}

  return {
    id: page.id,
    name: extractTitle(properties.Name) || 'Unnamed lead',
    stage: extractSelect(properties.Stage),
    phone: extractRichText(properties['Contact number']),
    leadSource: extractSelect(properties['Lead Source']),
    addedDate: extractDate(properties['Added date']),
    propertyCount: extractRichText(properties['Number of properties']),
    extraInformation: extractRichText(properties['Extra information']),
    url: page.url || `https://notion.so/${page.id.replace(/-/g, '')}`,
  }
}

async function notionFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${NOTION_API_BASE}${path}`

  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      ...getNotionHeaders(),
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Notion API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

/**
 * Add a comment to a Notion page
 */
export async function addCommentToNotionPage(
  pageId: string,
  comment: string
): Promise<void> {
  await notionFetch('/comments', {
    method: 'POST',
    body: JSON.stringify({
      parent: { page_id: pageId },
      rich_text: [
        {
          text: {
            content: comment,
          },
        },
      ],
    }),
  })
}

/**
 * Update the Extra information column on a lead page
 */
export async function updateLeadExtraInformation(
  pageId: string,
  text: string
): Promise<void> {
  await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      properties: {
        'Extra information': {
          rich_text: [{ text: { content: text } }],
        },
      },
    }),
  })
}

/**
 * Send portfolio form lead to Notion database
 * Returns the Notion page ID
 */
export async function sendPortfolioLeadToNotion(
  name: string,
  phone: string,
  propertyCount: string | null
): Promise<string> {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    throw new Error('Notion credentials not configured')
  }

  const databaseId = getDatabaseId()
  const currentDate = new Date().toISOString().split('T')[0]

  const properties: Record<string, any> = {
    Stage: { select: { name: 'New Lead' } },
    Name: { title: [{ text: { content: name } }] },
    'Contact number': { rich_text: [{ text: { content: phone } }] },
    'Lead Source': { select: { name: 'Facebook ads' } },
    'Added date': { date: { start: currentDate } },
  }

  if (propertyCount) {
    properties['Number of properties'] = {
      rich_text: [{ text: { content: propertyCount } }],
    }
  }

  const pageData = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  })

  return pageData.id
}

/**
 * Fetch database schema and Stage select options
 */
export async function getLeadsDatabase(): Promise<{
  stages: string[]
}> {
  const databaseId = getDatabaseId()
  const database = await notionFetch(`/databases/${databaseId}`)
  const stageProperty = database.properties?.Stage

  const stages: string[] = []
  if (stageProperty?.type === 'select' && stageProperty.select?.options) {
    for (const option of stageProperty.select.options) {
      if (option.name) {
        stages.push(option.name)
      }
    }
  }

  return { stages }
}

/**
 * Query all leads from the Notion database
 */
export async function queryLeads(): Promise<Lead[]> {
  const databaseId = getDatabaseId()
  const leads: Lead[] = []
  let startCursor: string | undefined

  do {
    const body: Record<string, any> = {
      page_size: 100,
      sorts: [{ property: 'Added date', direction: 'descending' }],
    }

    if (startCursor) {
      body.start_cursor = startCursor
    }

    const data = await notionFetch(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    for (const page of data.results || []) {
      leads.push(parseLeadFromPage(page))
    }

    startCursor = data.has_more ? data.next_cursor : undefined
  } while (startCursor)

  return leads
}

/**
 * Fetch a single lead by page ID
 */
export async function getLead(pageId: string): Promise<Lead> {
  const page = await notionFetch(`/pages/${pageId}`)
  return parseLeadFromPage(page)
}

/**
 * Fetch comments for a lead page
 */
export async function getLeadComments(pageId: string): Promise<NotionComment[]> {
  const comments: NotionComment[] = []
  let startCursor: string | undefined

  do {
    const path = startCursor
      ? `/comments?block_id=${pageId}&start_cursor=${startCursor}`
      : `/comments?block_id=${pageId}`

    const data = await notionFetch(path)

    for (const comment of data.results || []) {
      const text = (comment.rich_text || [])
        .map((item: any) => item.plain_text || '')
        .join('')
        .trim()

      if (!text) {
        continue
      }

      comments.push({
        id: comment.id,
        text,
        createdTime: comment.created_time,
        createdBy: comment.created_by?.id ?? null,
      })
    }

    startCursor = data.has_more ? data.next_cursor : undefined
  } while (startCursor)

  return comments
}

/**
 * Group leads by stage using dynamic stage options from Notion
 */
export function groupLeadsByStage(
  leads: Lead[],
  stages: string[]
): { stage: string; leads: Lead[] }[] {
  const grouped = new Map<string, Lead[]>()

  for (const stage of stages) {
    grouped.set(stage, [])
  }

  const unassigned: Lead[] = []

  for (const lead of leads) {
    if (lead.stage && grouped.has(lead.stage)) {
      grouped.get(lead.stage)!.push(lead)
    } else {
      unassigned.push(lead)
    }
  }

  const columns = stages.map((stage) => ({
    stage,
    leads: grouped.get(stage) || [],
  }))

  if (unassigned.length > 0) {
    columns.push({ stage: 'Unassigned', leads: unassigned })
  }

  return columns
}

/**
 * Update the Stage select property on a lead page
 */
export async function updateLeadStage(pageId: string, stage: string): Promise<void> {
  const { stages } = await getLeadsDatabase()
  if (!stages.includes(stage)) {
    throw new Error(`Invalid stage: ${stage}`)
  }

  await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      properties: {
        Stage: { select: { name: stage } },
      },
    }),
  })
}

/**
 * Archive a lead page (Notion does not hard-delete pages)
 */
export async function archiveLead(pageId: string): Promise<void> {
  await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived: true }),
  })
}

/**
 * Delete a comment by ID (only comments created by this integration can be deleted)
 */
export async function deleteNotionComment(commentId: string): Promise<void> {
  await notionFetch(`/comments/${commentId}`, {
    method: 'DELETE',
  })
}
