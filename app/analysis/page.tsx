'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { LogOut } from 'lucide-react'

export default function AnalysisPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/analysis/logout', {
        method: 'POST',
      })
      if (response.ok) {
        router.push('/analysis/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-gradient px-4 md:px-0">
      <Navigation />
      
      {/* Header Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-8 md:pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <div className="flex justify-end mb-4">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-accent-red transition-colors disabled:opacity-50"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-50 mb-4 md:mb-6 leading-tight px-2">
              Market{' '}
              <span className="text-accent-red">Analysis Portal</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-2">
              Internal market analysis and insights platform
            </p>
            <div className="flex justify-center mt-6 md:mt-8">
              <div className="h-1 w-16 sm:w-20 bg-accent-red"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area - Placeholder for future functionality */}
      <section className="px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-12 md:pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="bg-navy-900/50 border border-accent-red/30 rounded-2xl p-8 md:p-12 shadow-xl">
            <div className="text-center">
              <p className="text-gray-300 text-base sm:text-lg md:text-xl">
                Content area ready for market analysis tools and insights
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
