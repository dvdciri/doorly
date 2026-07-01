import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateCredentials } from '@/lib/auth'

const COOKIE_NAME = 'backoffice-auth'
const COOKIE_SECRET = process.env.ANALYSIS_COOKIE_SECRET
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Validate credentials
    const isValid = await validateCredentials(username.trim(), password)

    if (!isValid) {
      // Log for debugging (remove sensitive info in production)
      console.log('Login attempt failed:', {
        providedUsername: username.trim(),
        expectedUsername: process.env.ANALYSIS_USERNAME ? 'set' : 'not set',
        passwordHashSet: process.env.ANALYSIS_PASSWORD_HASH ? 'set' : 'not set',
      })
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Ensure COOKIE_SECRET is configured
    if (!COOKIE_SECRET) {
      console.error('ANALYSIS_COOKIE_SECRET is not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Set authentication cookie
    const cookieStore = cookies()
    const isProduction = process.env.NODE_ENV === 'production'
    
    cookieStore.set(COOKIE_NAME, COOKIE_SECRET, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
