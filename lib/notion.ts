/**
 * Add a comment to a Notion page
 */
export async function addCommentToNotionPage(
  pageId: string,
  comment: string
): Promise<void> {
  // Check if Notion credentials are configured
  if (!process.env.NOTION_TOKEN) {
    throw new Error('Notion credentials not configured')
  }

  const response = await fetch('https://api.notion.com/v1/comments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
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

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Notion comment API error: ${response.status} ${response.statusText} - ${errorText}`)
  }
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
  // Check if Notion credentials are configured
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    throw new Error('Notion credentials not configured')
  }

  const databaseId = process.env.NOTION_DATABASE_ID || '2a206b45-463e-8113-83db-000b5fe676d0'
  
  // Get current date in ISO 8601 format (YYYY-MM-DD)
  const currentDate = new Date().toISOString().split('T')[0]

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        // Stage field (select)
        Stage: { select: { name: 'Lead' } },
        // Name field (title) - using person name
        Name: { title: [{ text: { content: name } }] },
        // Contact number field (rich_text)
        'Contact number': { rich_text: [{ text: { content: phone } }] },
        // Lead Source field (select)
        'Lead Source': { select: { name: 'Facebook ads' } },
        // Added date field (date)
        'Added date': { date: { start: currentDate } },
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Notion API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  // Extract page ID from response
  const pageData = await response.json()
  const pageId = pageData.id

  // Add property count as a comment if provided
  if (propertyCount) {
    try {
      await addCommentToNotionPage(pageId, `Number of properties: ${propertyCount}`)
    } catch (commentError: any) {
      // Log error but don't fail the entire operation since page was created successfully
      console.error('Failed to add comment to Notion page:', commentError.message || commentError)
    }
  }

  return pageId
}
