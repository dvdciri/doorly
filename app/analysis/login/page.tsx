'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navigation from '../../components/Navigation'
import Footer from '../../components/Footer'
import { Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Check if already authenticated (middleware should handle this, but just in case)
    // This is a client-side check, middleware is the real protection
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/analysis/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid username or password')
        setIsSubmitting(false)
        return
      }

      // Success - redirect to analysis page or the redirect URL
      const redirectTo = searchParams.get('redirect') || '/analysis'
      router.push(redirectTo)
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-gradient px-4 md:px-0">
      <Navigation />
      
      {/* Login Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-12 md:pb-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-accent-red/20 border border-accent-red/30">
                <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-accent-red" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-50 mb-3 sm:mb-4 leading-tight">
              Market Analysis{' '}
              <span className="text-accent-red">Portal</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
              Sign in to access the internal portal
            </p>
            <div className="flex justify-center mt-4 md:mt-6">
              <div className="h-1 w-16 sm:w-20 bg-accent-red"></div>
            </div>
          </div>

          {/* Login Form */}
          <div className="bg-navy-900/50 backdrop-blur-sm border border-accent-red/30 rounded-2xl p-6 sm:p-8 md:p-10 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError('')
                  }}
                  required
                  className={`w-full px-4 py-3.5 min-h-[48px] bg-navy-800/50 border rounded-xl text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none transition text-base sm:text-lg ${
                    error ? 'border-red-500' : 'border-navy-700'
                  }`}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  required
                  className={`w-full px-4 py-3.5 min-h-[48px] bg-navy-800/50 border rounded-xl text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none transition text-base sm:text-lg ${
                    error ? 'border-red-500' : 'border-navy-700'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent-red hover:bg-accent-red/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 px-6 min-h-[52px] rounded-xl font-semibold text-base sm:text-lg transition-all shadow-lg shadow-accent-red/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
