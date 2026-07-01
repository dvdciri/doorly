import { Pool, type PoolClient } from 'pg'

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

async function ensureUtcSession(client: PoolClient): Promise<void> {
  await client.query("SET TIME ZONE 'UTC'")
}

const originalConnect = pool.connect.bind(pool)
pool.connect = (async (...args: Parameters<typeof pool.connect>) => {
  const client = await originalConnect(...args)
  await ensureUtcSession(client)
  return client
}) as typeof pool.connect

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

function toUnixSeconds(value: Date | number): number {
  return typeof value === 'number' ? value : Math.floor(value.getTime() / 1000)
}

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

export type WhatsAppMessageType = 'text' | 'image' | 'video' | 'audio'

export interface WhatsAppMessageRow {
  id: number
  wa_message_id: string | null
  phone: string
  direction: 'inbound' | 'outbound'
  body: string
  wa_timestamp: Date
  notion_page_id: string | null
  status: string | null
  status_at: Date | null
  created_at: Date
  message_type: WhatsAppMessageType
  media_mime_type: string | null
  wa_media_id: string | null
  media_blob_pathname: string | null
}

export interface WhatsAppContactRow {
  phone: string
  wa_profile_name: string | null
  updated_at: Date
}

export type WhatsAppMessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

const MESSAGE_SELECT = `id, wa_message_id, phone, direction, body, wa_timestamp, notion_page_id, status, status_at, created_at, message_type, media_mime_type, wa_media_id, media_blob_pathname`

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
          wa_timestamp TIMESTAMPTZ NOT NULL,
          notion_page_id TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await query(`
        CREATE TABLE IF NOT EXISTS whatsapp_read_state (
          phone TEXT PRIMARY KEY,
          last_read_at TIMESTAMPTZ NOT NULL
        );
      `)

      await query(`
        CREATE TABLE IF NOT EXISTS whatsapp_contact (
          phone TEXT PRIMARY KEY,
          wa_profile_name TEXT,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await query(`
        ALTER TABLE whatsapp_message ADD COLUMN IF NOT EXISTS status TEXT;
      `)
      await query(`
        ALTER TABLE whatsapp_message ADD COLUMN IF NOT EXISTS status_at TIMESTAMPTZ;
      `)
      await query(`
        ALTER TABLE whatsapp_message ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
      `)
      await query(`
        ALTER TABLE whatsapp_message ADD COLUMN IF NOT EXISTS media_mime_type TEXT;
      `)
      await query(`
        ALTER TABLE whatsapp_message ADD COLUMN IF NOT EXISTS wa_media_id TEXT;
      `)
      await query(`
        ALTER TABLE whatsapp_message ADD COLUMN IF NOT EXISTS media_blob_pathname TEXT;
      `)

      await query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'whatsapp_message'
              AND column_name = 'wa_timestamp'
              AND udt_name = 'timestamp'
          ) THEN
            ALTER TABLE whatsapp_message
              ALTER COLUMN wa_timestamp TYPE TIMESTAMPTZ USING wa_timestamp AT TIME ZONE 'UTC';
          END IF;
        END $$;
      `)
      await query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'whatsapp_message'
              AND column_name = 'status_at'
              AND udt_name = 'timestamp'
          ) THEN
            ALTER TABLE whatsapp_message
              ALTER COLUMN status_at TYPE TIMESTAMPTZ USING status_at AT TIME ZONE 'UTC';
          END IF;
        END $$;
      `)
      await query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'whatsapp_message'
              AND column_name = 'created_at'
              AND udt_name = 'timestamp'
          ) THEN
            ALTER TABLE whatsapp_message
              ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
          END IF;
        END $$;
      `)
      await query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'whatsapp_read_state'
              AND column_name = 'last_read_at'
              AND udt_name = 'timestamp'
          ) THEN
            ALTER TABLE whatsapp_read_state
              ALTER COLUMN last_read_at TYPE TIMESTAMPTZ USING last_read_at AT TIME ZONE 'UTC';
          END IF;
        END $$;
      `)
      await query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'whatsapp_contact'
              AND column_name = 'updated_at'
              AND udt_name = 'timestamp'
          ) THEN
            ALTER TABLE whatsapp_contact
              ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
          END IF;
        END $$;
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
  waTimestamp?: Date | number
  notionPageId?: string | null
  status?: WhatsAppMessageStatus | null
  statusAt?: Date | number | null
  messageType?: WhatsAppMessageType
  mediaMimeType?: string | null
  waMediaId?: string | null
  mediaBlobPathname?: string | null
}): Promise<WhatsAppMessageRow> {
  await initializeLeadsDatabase()

  const waTimestampSeconds =
    params.waTimestamp === undefined ? null : toUnixSeconds(params.waTimestamp)
  const statusAtSeconds =
    params.statusAt === undefined || params.statusAt === null
      ? null
      : toUnixSeconds(params.statusAt)

  const result = await query(
    `INSERT INTO whatsapp_message (
       wa_message_id, phone, direction, body, wa_timestamp, notion_page_id, status, status_at,
       message_type, media_mime_type, wa_media_id, media_blob_pathname
     )
     VALUES (
       $1, $2, $3, $4,
       COALESCE(to_timestamp($5::double precision), NOW()),
       $6, $7,
       CASE WHEN $8::double precision IS NULL THEN NULL ELSE to_timestamp($8::double precision) END,
       $9, $10, $11, $12
     )
     ON CONFLICT (wa_message_id) DO NOTHING
     RETURNING ${MESSAGE_SELECT}`,
    [
      params.waMessageId || null,
      params.phone,
      params.direction,
      params.body,
      waTimestampSeconds,
      params.notionPageId || null,
      params.status || null,
      statusAtSeconds,
      params.messageType || 'text',
      params.mediaMimeType || null,
      params.waMediaId || null,
      params.mediaBlobPathname || null,
    ]
  )

  if (result.rows.length > 0) {
    return result.rows[0]
  }

  if (params.waMessageId) {
    const existing = await query(
      `SELECT ${MESSAGE_SELECT} FROM whatsapp_message WHERE wa_message_id = $1`,
      [params.waMessageId]
    )
    return existing.rows[0]
  }

  throw new Error('Failed to insert WhatsApp message')
}

export async function upsertWhatsAppContact(
  phone: string,
  waProfileName: string | null
): Promise<void> {
  await initializeLeadsDatabase()
  await query(
    `INSERT INTO whatsapp_contact (phone, wa_profile_name, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (phone) DO UPDATE SET
       wa_profile_name = COALESCE(EXCLUDED.wa_profile_name, whatsapp_contact.wa_profile_name),
       updated_at = CURRENT_TIMESTAMP`,
    [phone, waProfileName]
  )
}

export async function getWhatsAppContact(phone: string): Promise<WhatsAppContactRow | null> {
  await initializeLeadsDatabase()
  const result = await query(
    `SELECT phone, wa_profile_name, updated_at FROM whatsapp_contact WHERE phone = $1`,
    [phone]
  )
  return result.rows[0] || null
}

const STATUS_RANK: Record<string, number> = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 0,
}

export async function updateWhatsAppMessageStatus(
  waMessageId: string,
  status: string,
  statusAt: Date | number
): Promise<void> {
  await initializeLeadsDatabase()

  const statusAtSeconds = toUnixSeconds(statusAt)

  const existing = await query(
    `SELECT status FROM whatsapp_message WHERE wa_message_id = $1`,
    [waMessageId]
  )

  if (existing.rows.length === 0) {
    return
  }

  const currentStatus = existing.rows[0].status as string | null
  const currentRank = currentStatus ? (STATUS_RANK[currentStatus] ?? 0) : 0
  const newRank = STATUS_RANK[status] ?? 0

  if (status !== 'failed' && currentRank > newRank) {
    return
  }

  if (status === 'sent') {
    await query(
      `UPDATE whatsapp_message
       SET status = $1,
           status_at = to_timestamp($2::double precision),
           wa_timestamp = to_timestamp($2::double precision)
       WHERE wa_message_id = $3`,
      [status, statusAtSeconds, waMessageId]
    )
  } else {
    await query(
      `UPDATE whatsapp_message
       SET status = $1, status_at = to_timestamp($2::double precision)
       WHERE wa_message_id = $3`,
      [status, statusAtSeconds, waMessageId]
    )
  }
}

export async function getUnreadInboundMessageIds(phone: string): Promise<string[]> {
  await initializeLeadsDatabase()
  const readState = await query(
    `SELECT last_read_at FROM whatsapp_read_state WHERE phone = $1`,
    [phone]
  )
  const lastReadAt = readState.rows[0]?.last_read_at

  const result = lastReadAt
    ? await query(
        `SELECT wa_message_id FROM whatsapp_message
         WHERE phone = $1 AND direction = 'inbound' AND wa_timestamp > $2
           AND wa_message_id IS NOT NULL
         ORDER BY wa_timestamp ASC`,
        [phone, lastReadAt]
      )
    : await query(
        `SELECT wa_message_id FROM whatsapp_message
         WHERE phone = $1 AND direction = 'inbound' AND wa_message_id IS NOT NULL
         ORDER BY wa_timestamp ASC`,
        [phone]
      )

  return result.rows.map((row) => row.wa_message_id).filter(Boolean)
}

export async function getWhatsAppMessages(phone: string): Promise<WhatsAppMessageRow[]> {
  await initializeLeadsDatabase()
  const result = await query(
    `SELECT ${MESSAGE_SELECT}
     FROM whatsapp_message
     WHERE phone = $1
     ORDER BY wa_timestamp ASC, id ASC`,
    [phone]
  )
  return result.rows
}

export async function getWhatsAppMessageById(
  messageId: number
): Promise<WhatsAppMessageRow | null> {
  await initializeLeadsDatabase()
  const result = await query(
    `SELECT ${MESSAGE_SELECT} FROM whatsapp_message WHERE id = $1`,
    [messageId]
  )
  return result.rows[0] || null
}

export async function updateWhatsAppMessageMedia(
  messageId: number,
  mediaBlobPathname: string,
  mediaMimeType?: string | null
): Promise<void> {
  await initializeLeadsDatabase()
  await query(
    `UPDATE whatsapp_message
     SET media_blob_pathname = $1,
         media_mime_type = COALESCE($2, media_mime_type)
     WHERE id = $3`,
    [mediaBlobPathname, mediaMimeType || null, messageId]
  )
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

