import { NextResponse } from 'next/server'
import { query, initializePortfolioDatabase } from '@/lib/db'
import { sendPortfolioSubmissionEmail } from '@/lib/email'
import { sendLeadEvent } from '@/lib/facebook-conversions'
import { sendPortfolioLeadToNotion } from '@/lib/notion'
import { validateUKPhone, normalizeUKPhone } from '@/lib/phone'

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
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone number are required' },
        { status: 400 }
      )
    }

    // Validate and normalize UK phone number
    if (!validateUKPhone(phone)) {
      return NextResponse.json(
        { error: 'Please enter a valid UK phone number' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizeUKPhone(phone.trim())
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Please enter a valid UK phone number' },
        { status: 400 }
      )
    }

    // Ensure table exists before inserting (creates table if it doesn't exist)
    await initializePortfolioDatabase()

    // Sanitize inputs
    const sanitizedName = name.trim()
    const sanitizedPhone = normalizedPhone // Use normalized phone number
    const sanitizedPropertyCount = propertyCount ? propertyCount.trim() : null

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
        propertyCount: sanitizedPropertyCount || undefined,
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
        propertyCount: sanitizedPropertyCount || undefined,
      })
    } catch (fbError: any) {
      // Log error but don't fail the form submission
      console.error('Facebook Conversions API Lead event failed, but form submission succeeded:', fbError.message || fbError)
    }

    // Send lead to Notion database (don't fail form submission if this fails)
    let notionPageId: string | null = null
    try {
      notionPageId = await sendPortfolioLeadToNotion(
        sanitizedName,
        sanitizedPhone,
        sanitizedPropertyCount
      )
    } catch (notionError: any) {
      // Log error but don't fail the form submission
      console.error('Notion API failed, but form submission succeeded:', notionError.message || notionError)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Submission received successfully',
        id: result.rows[0].id,
        notionPageId: notionPageId,
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


