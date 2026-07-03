'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { LogOut, Building2, ArrowRight, DollarSign, MapPin, Users } from 'lucide-react'

interface Tool {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  status?: 'active' | 'coming-soon'
}

export default function BackofficeDashboard() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const tools: Tool[] = [
    {
      id: 'leads',
      title: 'Property Leads Pipeline',
      description: 'Manage property leads, pipeline stages, and Notion comments',
      icon: <Users className="w-8 h-8" />,
      href: '/backoffice/leads',
      status: 'active',
    },
    {
      id: 'land-registry',
      title: 'Land Registry Query',
      description: 'Query UK Land Registry house price data by region, property type, and time period',
      icon: <Building2 className="w-8 h-8" />,
      href: '/backoffice/land-registry',
      status: 'active',
    },
    {
      id: 'ons-salary',
      title: 'ONS Salary Data',
      description: 'Query UK salary and earnings data by local authority from the Office for National Statistics',
      icon: <DollarSign className="w-8 h-8" />,
      href: '/backoffice/ons-salary',
      status: 'active',
    },
    {
      id: 'portfolio-address',
      title: 'Portfolio Address Analysis',
      description: 'Analyze rough addresses to find full addresses, property types, and EPC ratings',
      icon: <MapPin className="w-8 h-8" />,
      href: '/backoffice/portfolio-address',
      status: 'active',
    },
  ]

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/backoffice/logout', {
        method: 'POST',
      })
      if (response.ok) {
        router.push('/backoffice/login')
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
              Doorly{' '}
              <span className="text-accent-red">Back Office</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-2">
              Internal tools and operations
            </p>
            <div className="flex justify-center mt-6 md:mt-8">
              <div className="h-1 w-16 sm:w-20 bg-accent-red"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-12 md:pb-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-50 mb-8">Available Tools</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                className={`group relative bg-navy-900/50 border rounded-2xl p-6 shadow-xl transition-all duration-300 ${
                  tool.status === 'active'
                    ? 'border-accent-red/30 hover:border-accent-red/60 hover:shadow-2xl hover:scale-105 cursor-pointer'
                    : 'border-gray-700/50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-accent-red/10 rounded-lg text-accent-red">
                    {tool.icon}
                  </div>
                  {tool.status === 'active' && (
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-accent-red transition-colors" />
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-gray-50 mb-2 group-hover:text-accent-red transition-colors">
                  {tool.title}
                </h3>
                
                <p className="text-gray-300 text-sm mb-4">
                  {tool.description}
                </p>

                {tool.status === 'coming-soon' && (
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-800 rounded-full">
                    Coming Soon
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
