import { NextResponse } from 'next/server'
import { query, initializePortfolioDatabase } from '@/lib/db'
import { sendPortfolioSubmissionEmail } from '@/lib/email'
import { sendLeadEvent } from '@/lib/facebook-conversions'

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
    const { name, phone, propertyCount } = body

    // Validate required fields
    if (!name || !phone || !propertyCount) {
      return NextResponse.json(
        { error: 'Name, phone number, and property count are required' },
        { status: 400 }
      )
    }

    // Validate phone number format
    if (!validateUKPhone(phone)) {
      return NextResponse.json(
        { error: 'Please enter a valid UK phone number' },
        { status: 400 }
      )
    }

    // Ensure table exists before inserting (creates table if it doesn't exist)
    await initializePortfolioDatabase()

    // Sanitize inputs
    const sanitizedName = name.trim()
    const sanitizedPhone = phone.trim()
    const sanitizedPropertyCount = propertyCount.trim()

    // Insert new submission
    const result = await query(
      `INSERT INTO portfolio_submission (name, phone, property_count, status)
       VALUES ($1, $2, $3, 'complete')
       RETURNING id, created_at, updated_at`,
      [sanitizedName, sanitizedPhone, sanitizedPropertyCount]
    )

    // Send email notification (don't fail form submission if email fails)
    try {
      await sendPortfolioSubmissionEmail({
        name: sanitizedName,
        phone: sanitizedPhone,
        propertyCount: sanitizedPropertyCount,
        submittedAt: new Date(result.rows[0].created_at),
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
        propertyCount: sanitizedPropertyCount,
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
    console.error('Error submitting portfolio form:', error)
    
    // Don't expose database errors to client
    return NextResponse.json(
      { error: 'Failed to submit form. Please try again later.' },
      { status: 500 }
    )
  }
}

