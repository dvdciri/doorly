import { cookies } from 'next/headers'

const COOKIE_NAME = 'analysis-auth'
const COOKIE_SECRET = process.env.ANALYSIS_COOKIE_SECRET

/**
 * Verify if the user is authenticated by checking the auth cookie
 */
export function isAuthenticated(): boolean {
  const cookieStore = cookies()
  const authCookie = cookieStore.get(COOKIE_NAME)
  
  if (!authCookie) {
    return false
  }

  // Verify the cookie value matches our secret
  // In a more complex system, you might verify a JWT or session token here
  return authCookie.value === COOKIE_SECRET
}

/**
 * Get the authentication cookie value
 */
export function getAuthCookie(): string | undefined {
  const cookieStore = cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

/**
 * Validate username and password against environment variables
 */
export async function validateCredentials(username: string, password: string): Promise<boolean> {
  // Get and clean environment variables (remove quotes if present)
  let expectedUsername = process.env.ANALYSIS_USERNAME?.trim()
  let passwordHashEncoded = process.env.ANALYSIS_PASSWORD_HASH?.trim()
  
  // Remove surrounding quotes if present
  if (expectedUsername && (expectedUsername.startsWith('"') || expectedUsername.startsWith("'"))) {
    expectedUsername = expectedUsername.slice(1, -1).trim()
  }
  if (passwordHashEncoded && (passwordHashEncoded.startsWith('"') || passwordHashEncoded.startsWith("'"))) {
    passwordHashEncoded = passwordHashEncoded.slice(1, -1).trim()
  }

  if (!expectedUsername || !passwordHashEncoded) {
    console.error('Authentication credentials not configured in environment variables')
    return false
  }

  // Decode the base64-encoded hash
  let passwordHash: string
  try {
    passwordHash = Buffer.from(passwordHashEncoded, 'base64').toString('utf-8')
  } catch (error) {
    console.error('Error decoding password hash:', error)
    return false
  }

  // Validate hash format
  if (passwordHash.length !== 60 || (!passwordHash.startsWith('$2a$') && !passwordHash.startsWith('$2b$'))) {
    console.error('Invalid password hash format')
    return false
  }

  // Check username (case-sensitive)
  if (username.trim() !== expectedUsername) {
    return false
  }

  // Check password using bcrypt
  try {
    const bcrypt = await import('bcryptjs')
    const passwordMatch = bcrypt.compareSync(password, passwordHash)
    if (!passwordMatch) {
      console.log('Password mismatch - hash comparison failed')
    }
    return passwordMatch
  } catch (error) {
    console.error('Error comparing password:', error)
    return false
  }
}
