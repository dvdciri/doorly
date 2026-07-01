'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '../../components/Navigation'
import Footer from '../../components/Footer'
import { LogOut, Loader2, ArrowLeft, DollarSign } from 'lucide-react'
import Link from 'next/link'

interface OnsSalaryResult {
  value?: number
  [key: string]: any // For dynamic dimension fields
}

interface QueryConfig {
  area: string
  year: string
  sex: string
  employmentStatus: string
}

export default function OnsSalaryPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<OnsSalaryResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [config, setConfig] = useState<QueryConfig>({
    area: '',
    year: '',
    sex: 'all',
    employmentStatus: 'all',
  })

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

  const handleFetchSalaryData = async () => {
    setLoading(true)
    setError(null)
    setResults([])
    setMetadata(null)
    setMessage(null)

    try {
      const response = await fetch('/api/backoffice/ons-salary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          area: config.area,
          year: config.year || undefined,
          sex: config.sex,
          employmentStatus: config.employmentStatus,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch data: ${response.status}`)
      }

      if (data.results && Array.isArray(data.results)) {
        setResults(data.results)
        if (data.metadata) {
          setMetadata(data.metadata)
        }
        if (data.message) {
          setMessage(data.message)
        }
      } else {
        throw new Error('Unexpected response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching ONS salary data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-gradient px-4 md:px-0">
      <Navigation />
      
      {/* Header Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-8 md:pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <div className="flex justify-between items-center mb-4">
              <Link
                href="/backoffice"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-accent-red transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
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
              ONS{' '}
              <span className="text-accent-red">Salary Data</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-2">
              Query UK salary and earnings data by local authority from the Office for National Statistics
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
              {/* Area Input */}
              <div>
                <label htmlFor="area" className="block text-sm font-medium text-gray-300 mb-2">
                  Local Authority <span className="text-accent-red">*</span>
                </label>
                <input
                  type="text"
                  id="area"
                  value={config.area}
                  onChange={(e) => setConfig({ ...config, area: e.target.value })}
                  placeholder="e.g., Manchester, E08000003"
                  className="w-full px-4 py-2 bg-navy-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Enter a local authority name (e.g., "Manchester") or ONS geography code
                </p>
              </div>

              {/* Year Input */}
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-300 mb-2">
                  Year (Optional)
                </label>
                <input
                  type="text"
                  id="year"
                  value={config.year}
                  onChange={(e) => setConfig({ ...config, year: e.target.value })}
                  placeholder="e.g., 2023 (leave empty for latest)"
                  className="w-full px-4 py-2 bg-navy-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent"
                />
              </div>

              {/* Sex Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Sex
                </label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="sex"
                        value={option.value}
                        checked={config.sex === option.value}
                        onChange={(e) => setConfig({ ...config, sex: e.target.value })}
                        className="w-4 h-4 text-accent-red bg-navy-800 border-gray-600 focus:ring-accent-red focus:ring-2"
                      />
                      <span className="text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Employment Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Employment Status
                </label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'full-time', label: 'Full-time' },
                    { value: 'part-time', label: 'Part-time' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="employmentStatus"
                        value={option.value}
                        checked={config.employmentStatus === option.value}
                        onChange={(e) => setConfig({ ...config, employmentStatus: e.target.value })}
                        className="w-4 h-4 text-accent-red bg-navy-800 border-gray-600 focus:ring-accent-red focus:ring-2"
                      />
                      <span className="text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Fetch Button */}
            <div className="mb-6">
              <button
                onClick={handleFetchSalaryData}
                disabled={loading || !config.area.trim()}
                className="px-6 py-3 bg-accent-red text-white rounded-lg font-semibold hover:bg-accent-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? 'Fetching Data...' : 'Fetch Salary Data'}
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
                <p className="text-red-300 font-semibold mb-1">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {message && (
              <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-300 font-semibold mb-1">Notice</p>
                <p className="text-yellow-200 text-sm">{message}</p>
              </div>
            )}

            {metadata && (
              <div className="mb-6 p-4 bg-navy-800/50 border border-gray-700 rounded-lg">
                <p className="text-gray-300 text-sm">
                  <span className="font-semibold">Dataset:</span> {metadata.datasetTitle}
                </p>
                {metadata.unitOfMeasure && (
                  <p className="text-gray-300 text-sm mt-1">
                    <span className="font-semibold">Unit:</span> {metadata.unitOfMeasure}
                  </p>
                )}
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
                              {typeof row[key] === 'number' 
                                ? row[key].toLocaleString('en-GB', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  })
                                : row[key] || '-'
                              }
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
                <DollarSign className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-base sm:text-lg md:text-xl">
                  Enter a local authority name and click the button above to fetch salary data
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
