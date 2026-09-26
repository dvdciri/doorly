'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { LogOut, ArrowRight, Users, ClipboardCheck, CircleAlert } from 'lucide-react'
import { BackofficeToolbar } from './BackofficeToolbar'

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
      id: 'rent-check',
      title: 'Rent Check',
      description: 'Visualise rent data from Notion',
      icon: <ClipboardCheck className="w-8 h-8" />,
      href: '/backoffice/rent-check',
      status: 'active',
    },
    {
      id: 'arrears',
      title: 'Arrears Tracking',
      description: 'See which properties are in arrears, and by how much, as of a chosen month',
      icon: <CircleAlert className="w-8 h-8" />,
      href: '/backoffice/arrears',
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
      
      <section className="px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-4">
        <div className="max-w-7xl mx-auto">
          <BackofficeToolbar
            title={
              <>
                Doorly <span className="text-accent-red">Back Office</span>
              </>
            }
            subtitle="Internal tools and operations"
            right={
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-accent-red transition-colors disabled:opacity-50"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            }
          />
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pt-4 pb-12 md:pb-20">
        <div className="max-w-7xl mx-auto">
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
