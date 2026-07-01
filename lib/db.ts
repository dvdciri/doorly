import { Pool } from 'pg'

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Query helper function
export async function query(text: string, params?: any[]) {
  try {
    const res = await pool.query(text, params)
    return res
  } catch (error: any) {
    console.error('Database query error:', error)
    throw error
  }
}

// Initialize database table
export async function initializeDatabase() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS empty_property_submission (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL,
        property_state TEXT,
        name TEXT,
        phone TEXT,
        status TEXT DEFAULT 'partial',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Add property_state column if it doesn't exist (for existing tables)
    try {
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'empty_property_submission' 
        AND column_name = 'property_state';
      `)
      
      if (columnCheck.rows.length === 0) {
        await query(`
          ALTER TABLE empty_property_submission 
          ADD COLUMN property_state TEXT;
        `)
        console.log('Added property_state column to existing table')
      }
    } catch (alterError: any) {
      console.log('Column check/add:', alterError.message)
    }
    
    // Make name, phone, and property_state nullable for partial submissions
    try {
      await query(`
        ALTER TABLE empty_property_submission 
        ALTER COLUMN name DROP NOT NULL;
      `)
    } catch (alterError: any) {
      // Column might already be nullable or not exist
    }
    
    try {
      await query(`
        ALTER TABLE empty_property_submission 
        ALTER COLUMN phone DROP NOT NULL;
      `)
    } catch (alterError: any) {
      // Column might already be nullable or not exist
    }
    
    try {
      await query(`
        ALTER TABLE empty_property_submission 
        ALTER COLUMN property_state DROP NOT NULL;
      `)
    } catch (alterError: any) {
      // Column might already be nullable or not exist
    }
    
    // Add status column if it doesn't exist
    try {
      const statusCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'empty_property_submission' 
        AND column_name = 'status';
      `)
      
      if (statusCheck.rows.length === 0) {
        await query(`
          ALTER TABLE empty_property_submission 
          ADD COLUMN status TEXT DEFAULT 'partial';
        `)
        // Update existing records to 'complete' if they have name and phone
        await query(`
          UPDATE empty_property_submission 
          SET status = 'complete' 
          WHERE name IS NOT NULL AND phone IS NOT NULL;
        `)
        console.log('Added status column to existing table')
      }
    } catch (alterError: any) {
      console.log('Status column check/add:', alterError.message)
    }
    
    // Add updated_at column if it doesn't exist
    try {
      const updatedAtCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'empty_property_submission' 
        AND column_name = 'updated_at';
      `)
      
      if (updatedAtCheck.rows.length === 0) {
        await query(`
          ALTER TABLE empty_property_submission 
          ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `)
        console.log('Added updated_at column to existing table')
      }
    } catch (alterError: any) {
      console.log('Updated_at column check/add:', alterError.message)
    }
    
    // Drop email column if it exists (for existing tables)
    try {
      await query(`
        ALTER TABLE empty_property_submission 
        DROP COLUMN IF EXISTS email;
      `)
    } catch (alterError: any) {
      // Ignore error if column doesn't exist
    }
  } catch (error: any) {
    console.error('Error initializing database:', error)
    throw error
  }
}

// Initialize portfolio submission database table
export async function initializePortfolioDatabase() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS portfolio_submission (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        property_count TEXT,
        status TEXT DEFAULT 'complete',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Make property_count nullable for existing tables
    try {
      await query(`
        ALTER TABLE portfolio_submission 
        ALTER COLUMN property_count DROP NOT NULL;
      `)
      console.log('Made property_count nullable in portfolio_submission table')
    } catch (alterError: any) {
      // Column might already be nullable or constraint doesn't exist
      console.log('Property_count nullable check:', alterError.message)
    }
    
    // Add updated_at column if it doesn't exist (for existing tables)
    try {
      const updatedAtCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'portfolio_submission' 
        AND column_name = 'updated_at';
      `)
      
      if (updatedAtCheck.rows.length === 0) {
        await query(`
          ALTER TABLE portfolio_submission 
          ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `)
        console.log('Added updated_at column to portfolio_submission table')
      }
    } catch (alterError: any) {
      console.log('Updated_at column check/add for portfolio_submission:', alterError.message)
    }
    
    // Add additional_info column if it doesn't exist (for existing tables)
    try {
      const additionalInfoCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'portfolio_submission' 
        AND column_name = 'additional_info';
      `)
      
      if (additionalInfoCheck.rows.length === 0) {
        await query(`
          ALTER TABLE portfolio_submission 
          ADD COLUMN additional_info TEXT;
        `)
        console.log('Added additional_info column to portfolio_submission table')
      }
    } catch (alterError: any) {
      console.log('Additional_info column check/add for portfolio_submission:', alterError.message)
    }
  } catch (error: any) {
    console.error('Error initializing portfolio database:', error)
    throw error
  }
}

export interface WhatsAppMessageRow {
  id: number
  wa_message_id: string | null
  phone: string
  direction: 'inbound' | 'outbound'
  body: string
  wa_timestamp: Date
  notion_page_id: string | null
  created_at: Date
}

let leadsDbInitPromise: Promise<void> | null = null

export async function initializeLeadsDatabase() {
  if (leadsDbInitPromise) {
    return leadsDbInitPromise
  }

  leadsDbInitPromise = (async () => {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS whatsapp_message (
          id SERIAL PRIMARY KEY,
          wa_message_id TEXT UNIQUE,
          phone TEXT NOT NULL,
          direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
          body TEXT NOT NULL,
          wa_timestamp TIMESTAMP NOT NULL,
          notion_page_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await query(`
        CREATE TABLE IF NOT EXISTS whatsapp_read_state (
          phone TEXT PRIMARY KEY,
          last_read_at TIMESTAMP NOT NULL
        );
      `)
    } catch (error: any) {
      leadsDbInitPromise = null
      console.error('Error initializing leads database:', error)
      throw error
    }
  })()

  return leadsDbInitPromise
}

export async function insertWhatsAppMessage(params: {
  waMessageId?: string | null
  phone: string
  direction: 'inbound' | 'outbound'
  body: string
  waTimestamp: Date
  notionPageId?: string | null
}): Promise<WhatsAppMessageRow> {
  await initializeLeadsDatabase()

  const result = await query(
    `INSERT INTO whatsapp_message (wa_message_id, phone, direction, body, wa_timestamp, notion_page_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (wa_message_id) DO NOTHING
     RETURNING id, wa_message_id, phone, direction, body, wa_timestamp, notion_page_id, created_at`,
    [
      params.waMessageId || null,
      params.phone,
      params.direction,
      params.body,
      params.waTimestamp,
      params.notionPageId || null,
    ]
  )

  if (result.rows.length > 0) {
    return result.rows[0]
  }

  if (params.waMessageId) {
    const existing = await query(
      `SELECT id, wa_message_id, phone, direction, body, wa_timestamp, notion_page_id, created_at
       FROM whatsapp_message WHERE wa_message_id = $1`,
      [params.waMessageId]
    )
    return existing.rows[0]
  }

  throw new Error('Failed to insert WhatsApp message')
}

export async function getWhatsAppMessages(phone: string): Promise<WhatsAppMessageRow[]> {
  await initializeLeadsDatabase()
  const result = await query(
    `SELECT id, wa_message_id, phone, direction, body, wa_timestamp, notion_page_id, created_at
     FROM whatsapp_message
     WHERE phone = $1
     ORDER BY wa_timestamp ASC`,
    [phone]
  )
  return result.rows
}

export async function markWhatsAppRead(phone: string): Promise<void> {
  await initializeLeadsDatabase()
  await query(
    `INSERT INTO whatsapp_read_state (phone, last_read_at)
     VALUES ($1, CURRENT_TIMESTAMP)
     ON CONFLICT (phone) DO UPDATE SET last_read_at = CURRENT_TIMESTAMP`,
    [phone]
  )
}

export async function getUnreadWhatsAppPhones(): Promise<
  { phone: string; unreadCount: number; lastMessageAt: Date; lastMessageBody: string }[]
> {
  await initializeLeadsDatabase()
  const result = await query(`
    SELECT
      m.phone,
      COUNT(*)::int AS unread_count,
      MAX(m.wa_timestamp) AS last_message_at,
      (
        SELECT body FROM whatsapp_message m2
        WHERE m2.phone = m.phone AND m2.direction = 'inbound'
        ORDER BY m2.wa_timestamp DESC
        LIMIT 1
      ) AS last_message_body
    FROM whatsapp_message m
    LEFT JOIN whatsapp_read_state r ON r.phone = m.phone
    WHERE m.direction = 'inbound'
      AND (r.last_read_at IS NULL OR m.wa_timestamp > r.last_read_at)
    GROUP BY m.phone
    ORDER BY last_message_at DESC
  `)
  return result.rows.map((row) => ({
    phone: row.phone,
    unreadCount: row.unread_count,
    lastMessageAt: row.last_message_at,
    lastMessageBody: row.last_message_body,
  }))
}

export default pool

