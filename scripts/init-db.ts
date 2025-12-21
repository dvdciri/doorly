import { config } from 'dotenv'
import { resolve } from 'path'
import { initializeDatabase } from '../lib/db'

// Load environment variables from .env.local or .env
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

async function main() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('❌ Error: DATABASE_URL environment variable is not set')
      console.error('Please set DATABASE_URL in your .env.local or .env file')
      console.error('Example: DATABASE_URL=postgresql://user:password@localhost:5432/dbname')
      process.exit(1)
    }

    console.log('Initializing database...')
    await initializeDatabase()
    console.log('✅ Database initialized successfully!')
    process.exit(0)
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Error: Could not connect to database')
      console.error('Please make sure:')
      console.error('  1. Your database server is running')
      console.error('  2. DATABASE_URL is correct')
      console.error('  3. The database host and port are accessible')
    } else {
      console.error('❌ Error initializing database:', error.message)
    }
    process.exit(1)
  }
}

main()

