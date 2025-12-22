import { NextResponse } from 'next/server'
import { query, initializeDatabase } from '@/lib/db'

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

    const body = await request.json()
    const { address, propertyState } = body

    // Validate required fields
    if (!address || !propertyState) {
      return NextResponse.json(
        { error: 'Address and property state are required' },
        { status: 400 }
      )
    }

    // Ensure table exists before inserting (creates table if it doesn't exist)
    await initializeDatabase()

    // Sanitize inputs
    const sanitizedAddress = address.trim()
    const sanitizedPropertyState = propertyState.trim()

    // Check if a partial submission with this address and property_state already exists
    const existingCheck = await query(
      `SELECT id, status FROM empty_property_submission 
       WHERE address = $1 AND property_state = $2 AND status = 'partial' 
       ORDER BY created_at DESC LIMIT 1`,
      [sanitizedAddress, sanitizedPropertyState]
    )

    let submissionId: number

    if (existingCheck.rows.length > 0) {
      // Update existing partial submission (refresh timestamp)
      await query(
        `UPDATE empty_property_submission 
         SET updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [existingCheck.rows[0].id]
      )
      submissionId = existingCheck.rows[0].id
    } else {
      // Insert new partial submission
      const result = await query(
        `INSERT INTO empty_property_submission (address, property_state, status)
         VALUES ($1, $2, 'partial')
         RETURNING id, created_at`,
        [sanitizedAddress, sanitizedPropertyState]
      )
      submissionId = result.rows[0].id
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Step 1 submission received successfully',
        id: submissionId,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error submitting step 1:', error)
    
    // Don't expose database errors to client
    return NextResponse.json(
      { error: 'Failed to submit step 1. Please try again later.' },
      { status: 500 }
    )
  }
}

