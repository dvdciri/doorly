import { NextResponse } from 'next/server'
import { query, initializeDatabase } from '@/lib/db'

// Initialize database on first import
let dbInitialized = false

async function ensureDatabaseInitialized() {
  if (!dbInitialized) {
    await initializeDatabase()
    dbInitialized = true
  }
}

// Validate UK phone number
function validateUKPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
  
  if (cleaned.startsWith('44')) {
    const digits = cleaned.substring(2)
    return /^\d{10}$/.test(digits)
  } else if (cleaned.startsWith('0')) {
    const digits = cleaned.substring(1)
    return /^\d{10}$/.test(digits)
  }
  
  return /^\d{10}$/.test(cleaned)
}


export async function POST(request: Request) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set')
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      )
    }

    // Ensure database is initialized
    await ensureDatabaseInitialized()

    const body = await request.json()
    const { address, name, phone } = body

    // Validate required fields
    if (!address || !name || !phone) {
      return NextResponse.json(
        { error: 'Address, name, and phone number are required' },
        { status: 400 }
      )
    }

    // Validate UK phone number
    if (!validateUKPhone(phone)) {
      return NextResponse.json(
        { error: 'Invalid UK phone number' },
        { status: 400 }
      )
    }

    // Sanitize inputs (basic sanitization - PostgreSQL parameterized queries handle SQL injection)
    const sanitizedAddress = address.trim()
    const sanitizedName = name.trim()
    const sanitizedPhone = phone.trim()

    // Insert into database
    const result = await query(
      `INSERT INTO empty_property_submission (address, name, phone)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [sanitizedAddress, sanitizedName, sanitizedPhone]
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Submission received successfully',
        id: result.rows[0].id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error submitting form:', error)
    
    // Don't expose database errors to client
    return NextResponse.json(
      { error: 'Failed to submit form. Please try again later.' },
      { status: 500 }
    )
  }
}

