import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'backoffice-auth'
const COOKIE_SECRET = process.env.ANALYSIS_COOKIE_SECRET

function isAuthenticated(request: NextRequest): boolean {
  const authCookie = request.cookies.get(COOKIE_NAME)
  return Boolean(authCookie && authCookie.value === COOKIE_SECRET)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect legacy /analysis routes to /backoffice
  if (pathname === '/analysis' || pathname.startsWith('/analysis/')) {
    const newPath = pathname.replace(/^\/analysis/, '/backoffice')
    const redirectUrl = new URL(newPath, request.url)
    redirectUrl.search = request.nextUrl.search
    return NextResponse.redirect(redirectUrl)
  }

  // Protect /backoffice pages except login
  if (pathname.startsWith('/backoffice') && !pathname.startsWith('/backoffice/login')) {
    if (!isAuthenticated(request)) {
      const loginUrl = new URL('/backoffice/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect authenticated users away from login
  if (pathname === '/backoffice/login' && isAuthenticated(request)) {
    return NextResponse.redirect(new URL('/backoffice', request.url))
  }

  // Protect /api/backoffice routes except login/logout
  if (
    pathname.startsWith('/api/backoffice') &&
    !pathname.startsWith('/api/backoffice/login') &&
    !pathname.startsWith('/api/backoffice/logout')
  ) {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/backoffice/:path*', '/analysis/:path*', '/api/backoffice/:path*'],
}
