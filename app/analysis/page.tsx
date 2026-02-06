'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { LogOut, Loader2 } from 'lucide-react'

interface LandRegistryResult {
  regionName?: string
  region?: string
  gssCode?: string
  period?: string
  salesVolume?: string
  reportingPeriod?: string
  hpiAll?: string
  avgAll?: string
  pctMonthlyAll?: string
  pctYearlyAll?: string
  hpiDetached?: string
  avgDetached?: string
  pctMonthlyDetached?: string
  pctYearlyDetached?: string
  hpiSemi?: string
  avgSemi?: string
  pctMonthlySemi?: string
  pctYearlySemi?: string
  hpiTerraced?: string
  avgTerraced?: string
  pctMonthlyTerraced?: string
  pctYearlyTerraced?: string
  hpiFlat?: string
  avgFlat?: string
  pctMonthlyFlat?: string
  pctYearlyFlat?: string
  pivotableDate?: string
}

interface QueryConfig {
  periodFrom: string
  periodTo: string
  propertyTypes: string[]
}

export default function AnalysisPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<LandRegistryResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<QueryConfig>({
    periodFrom: '2020-01',
    periodTo: '2026-01',
    propertyTypes: ['all'],
  })

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

  const handleFetchLandRegistryData = async () => {
    setLoading(true)
    setError(null)
    setResults([])

    try {
      const response = await fetch('/api/analysis/land-registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodFrom: config.periodFrom,
          periodTo: config.periodTo,
          propertyTypes: config.propertyTypes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch data: ${response.status}`)
      }

      if (data.results && Array.isArray(data.results)) {
        setResults(data.results)
      } else {
        throw new Error('Unexpected response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching Land Registry data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePropertyTypeChange = (type: string, checked: boolean) => {
    if (type === 'all') {
      setConfig({ ...config, propertyTypes: checked ? ['all'] : [] })
    } else {
      const newTypes = checked
        ? [...config.propertyTypes.filter(t => t !== 'all'), type]
        : config.propertyTypes.filter(t => t !== type)
      setConfig({ ...config, propertyTypes: newTypes.length > 0 ? newTypes : ['all'] })
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

      {/* Main Content Area */}
      <section className="px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-12 md:pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="bg-navy-900/50 border border-accent-red/30 rounded-2xl p-8 md:p-12 shadow-xl">
            <h2 className="text-xl font-bold text-gray-50 mb-6">Query Configuration</h2>
            
            {/* Configuration Form */}
            <div className="mb-6 space-y-6">
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="periodFrom" className="block text-sm font-medium text-gray-300 mb-2">
                    Period From (YYYY-MM)
                  </label>
                  <input
                    type="text"
                    id="periodFrom"
                    value={config.periodFrom}
                    onChange={(e) => setConfig({ ...config, periodFrom: e.target.value })}
                    placeholder="2020-01"
                    pattern="\d{4}-\d{2}"
                    className="w-full px-4 py-2 bg-navy-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="periodTo" className="block text-sm font-medium text-gray-300 mb-2">
                    Period To (YYYY-MM)
                  </label>
                  <input
                    type="text"
                    id="periodTo"
                    value={config.periodTo}
                    onChange={(e) => setConfig({ ...config, periodTo: e.target.value })}
                    placeholder="2026-01"
                    pattern="\d{4}-\d{2}"
                    className="w-full px-4 py-2 bg-navy-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent"
                  />
                </div>
              </div>

              {/* Property Types */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Property Types
                </label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'detached', label: 'Detached' },
                    { value: 'semi', label: 'Semi-Detached' },
                    { value: 'terraced', label: 'Terraced' },
                    { value: 'flat', label: 'Flat/Maisonette' },
                  ].map((type) => (
                    <label
                      key={type.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={config.propertyTypes.includes(type.value)}
                        onChange={(e) => handlePropertyTypeChange(type.value, e.target.checked)}
                        className="w-4 h-4 text-accent-red bg-navy-800 border-gray-600 rounded focus:ring-accent-red focus:ring-2"
                      />
                      <span className="text-gray-300">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Fetch Button */}
            <div className="mb-6">
              <button
                onClick={handleFetchLandRegistryData}
                disabled={loading || config.propertyTypes.length === 0}
                className="px-6 py-3 bg-accent-red text-white rounded-lg font-semibold hover:bg-accent-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? 'Fetching Data...' : 'Fetch Land Registry Data'}
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
                <p className="text-red-300 font-semibold mb-1">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <h2 className="text-xl font-bold text-gray-50 mb-4">
                  Results ({results.length} records)
                </h2>
                <div className="overflow-x-auto border border-gray-700 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-navy-800">
                      <tr>
                        {Object.keys(results[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-navy-900/50 divide-y divide-gray-700">
                      {results.map((row, index) => (
                        <tr key={index} className="hover:bg-navy-800/50">
                          {Object.keys(results[0]).map((key) => (
                            <td
                              key={key}
                              className="px-4 py-3 whitespace-nowrap text-sm text-gray-300"
                            >
                              {row[key as keyof LandRegistryResult] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && results.length === 0 && !error && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-base sm:text-lg md:text-xl">
                  Click the button above to fetch Land Registry data
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
