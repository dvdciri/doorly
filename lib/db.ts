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
        property_state TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Add property_state column if it doesn't exist (for existing tables)
    // First check if column exists, then add it if needed
    try {
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'empty_property_submission' 
        AND column_name = 'property_state';
      `)
      
      if (columnCheck.rows.length === 0) {
        // Column doesn't exist, add it
        await query(`
          ALTER TABLE empty_property_submission 
          ADD COLUMN property_state TEXT;
        `)
        console.log('Added property_state column to existing table')
      }
    } catch (alterError: any) {
      // Ignore error if column already exists or table doesn't exist yet
      console.log('Column check/add:', alterError.message)
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

export default pool

