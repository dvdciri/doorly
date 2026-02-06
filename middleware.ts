import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'analysis-auth'
const COOKIE_SECRET = process.env.ANALYSIS_COOKIE_SECRET

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /analysis routes, but allow /analysis/login
  if (pathname.startsWith('/analysis') && !pathname.startsWith('/analysis/login')) {
    const authCookie = request.cookies.get(COOKIE_NAME)
    
    // Check if user is authenticated
    if (!authCookie || authCookie.value !== COOKIE_SECRET) {
      // Redirect to login page
      const loginUrl = new URL('/analysis/login', request.url)
      // Preserve the original URL as a query parameter for redirect after login
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // If accessing login page while already authenticated, redirect to /analysis
  if (pathname === '/analysis/login') {
    const authCookie = request.cookies.get(COOKIE_NAME)
    if (authCookie && authCookie.value === COOKIE_SECRET) {
      return NextResponse.redirect(new URL('/analysis', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/analysis/:path*',
}
