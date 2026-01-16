/**
 * Send portfolio form lead to Notion database
 */
export async function sendPortfolioLeadToNotion(
  name: string,
  phone: string,
  propertyCount: string | null
): Promise<void> {
  // Check if Notion credentials are configured
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    throw new Error('Notion credentials not configured')
  }

  const databaseId = process.env.NOTION_DATABASE_ID || '2a206b45-463e-8113-83db-000b5fe676d0'
  
  // Prepare property count value (handle null/undefined)
  const propertyCountValue = propertyCount || 'Not specified'
  
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
        Stage: { select: { name: '1. Lead' } },
        // Name field (title) - using person name
        Name: { title: [{ text: { content: name } }] },
        // Owner name field (rich_text)
        'Owner name': { rich_text: [{ text: { content: name } }] },
        // Contact number field (rich_text)
        'Contact number': { rich_text: [{ text: { content: phone } }] },
        // Number of properties field (rich_text)
        'Number of properties': { rich_text: [{ text: { content: propertyCountValue } }] },
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
}
