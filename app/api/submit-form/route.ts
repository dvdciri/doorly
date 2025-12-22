import { NextResponse } from 'next/server'
import { query, initializeDatabase } from '@/lib/db'
import { sendFormSubmissionEmail } from '@/lib/email'
import { sendLeadEvent } from '@/lib/facebook-conversions'

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

    const body = await request.json()
    const { address, propertyState, name, phone } = body

    // Validate required fields
    if (!address || !propertyState || !name || !phone) {
      return NextResponse.json(
        { error: 'Address, property state, name, and phone number are required' },
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

    // Ensure table exists before inserting (creates table if it doesn't exist)
    await initializeDatabase()

    // Sanitize inputs (basic sanitization - PostgreSQL parameterized queries handle SQL injection)
    const sanitizedAddress = address.trim()
    const sanitizedPropertyState = propertyState.trim()
    const sanitizedName = name.trim()
    const sanitizedPhone = phone.trim()

    // Check if a partial submission with this address and property_state already exists
    const existingCheck = await query(
      `SELECT id, created_at FROM empty_property_submission 
       WHERE address = $1 AND property_state = $2 AND status = 'partial' 
       ORDER BY created_at DESC LIMIT 1`,
      [sanitizedAddress, sanitizedPropertyState]
    )

    let result: any

    if (existingCheck.rows.length > 0) {
      // Update existing partial submission with step 2 data
      result = await query(
        `UPDATE empty_property_submission 
         SET name = $1, phone = $2, status = 'complete', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3
         RETURNING id, created_at, updated_at`,
        [sanitizedName, sanitizedPhone, existingCheck.rows[0].id]
      )
      // Use created_at from existing record
      result.rows[0].created_at = existingCheck.rows[0].created_at
    } else {
      // Insert new complete submission
      result = await query(
        `INSERT INTO empty_property_submission (address, property_state, name, phone, status)
         VALUES ($1, $2, $3, $4, 'complete')
         RETURNING id, created_at, updated_at`,
        [sanitizedAddress, sanitizedPropertyState, sanitizedName, sanitizedPhone]
      )
    }

    // Send email notification (don't fail form submission if email fails)
    try {
      await sendFormSubmissionEmail({
        address: sanitizedAddress,
        propertyState: sanitizedPropertyState,
        name: sanitizedName,
        phone: sanitizedPhone,
        submittedAt: new Date(result.rows[0].updated_at || result.rows[0].created_at),
      })
    } catch (emailError: any) {
      // Log error but don't fail the form submission
      console.error('Email notification failed, but form submission succeeded:', emailError.message || emailError)
    }

    // Send Lead event to Facebook Conversions API (don't fail form submission if this fails)
    try {
      await sendLeadEvent(request, {
        phone: sanitizedPhone,
        name: sanitizedName,
        address: sanitizedAddress,
        propertyState: sanitizedPropertyState,
      })
    } catch (fbError: any) {
      // Log error but don't fail the form submission
      console.error('Facebook Conversions API Lead event failed, but form submission succeeded:', fbError.message || fbError)
    }

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

