'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '../../components/Navigation'
import Footer from '../../components/Footer'
import { LogOut, ArrowLeft, MapPin, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, Download } from 'lucide-react'
import Link from 'next/link'

interface EPCRecord {
  address: string
  rating: string
  propertyType?: string
  totalFloorArea?: string
  lodgementDate?: string
  isExpired?: boolean
}

interface AddressResult {
  originalInput: string
  placeId?: string
  formattedAddress?: string
  addressComponents?: any[]
  geometry?: {
    location?: {
      lat: number
      lng: number
    }
  }
  epcRating?: string
  epcRatings?: Array<{ address: string; rating: string }> // Legacy
  epcMatchedAddress?: string // Legacy
  epcRecords?: EPCRecord[] // All matching EPC records with full details
  propertyType?: string // Legacy
  totalFloorArea?: string // Legacy
  error?: string
}

export default function PortfolioAddressAnalysisPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [addresses, setAddresses] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AddressResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

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

  const handleAddressesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAddresses(e.target.value)
    // Clear results and error when input changes
    if (results.length > 0 || error) {
      setResults([])
      setError(null)
      setExpandedRows(new Set())
    }
  }

  const toggleRowExpansion = (index: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const exportToCSV = () => {
    if (results.length === 0) {
      return
    }

    // Flatten results - each EPC record becomes its own row
    const csvRows: string[][] = []
    
    // CSV Headers
    const headers = [
      'Original Input',
      'Formalised Address',
      'EPC Matched Address',
      'EPC Rating',
      'Property Type',
      'Floor Area (m²)',
      'Expired',
      'Lodgement Date'
    ]
    csvRows.push(headers)

    // Process each result
    for (const result of results) {
      const epcRecords: EPCRecord[] = result.epcRecords || (result.epcRatings?.map(r => ({ 
        address: r.address, 
        rating: r.rating, 
        propertyType: result.propertyType, 
        totalFloorArea: result.totalFloorArea,
        lodgementDate: undefined,
        isExpired: false
      })) || [])
      
      // If no EPC records, add a row with empty EPC fields
      if (epcRecords.length === 0) {
        csvRows.push([
          result.originalInput || '',
          result.formattedAddress || '',
          '',
          '',
          '',
          '',
          '',
          ''
        ])
      } else {
        // Add a row for each EPC record
        for (const record of epcRecords) {
          csvRows.push([
            result.originalInput || '',
            result.formattedAddress || '',
            record.address || '',
            record.rating || '',
            record.propertyType || '',
            record.totalFloorArea || '',
            record.isExpired ? 'Yes' : 'No',
            record.lodgementDate || ''
          ])
        }
      }
    }

    // Convert to CSV string
    const csvContent = csvRows.map(row => {
      return row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const cellStr = String(cell || '')
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    }).join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `portfolio-address-analysis-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleAnalyzeAddresses = async () => {
    setLoading(true)
    setError(null)
    setResults([])

    try {
      // Split by newlines and filter empty lines
      const addressList = addresses
        .split('\n')
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0)

      if (addressList.length === 0) {
        setError('Please enter at least one address')
        setLoading(false)
        return
      }

      const response = await fetch('/api/analysis/portfolio-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresses: addressList }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to analyze addresses: ${response.status}`)
      }

      if (data.results && Array.isArray(data.results)) {
        setResults(data.results)
      } else {
        throw new Error('Unexpected response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Error analyzing addresses:', err)
    } finally {
      setLoading(false)
    }
  }

  const addressCount = addresses.split('\n').filter((line) => line.trim().length > 0).length

  const getEPCRatingBadge = (rating?: string) => {
    if (!rating) {
      return (
        <span className="text-gray-500 text-xs">-</span>
      )
    }

    const ratingUpper = rating.toUpperCase()
    let badgeClass = ''

    switch (ratingUpper) {
      case 'A':
        badgeClass = 'bg-green-600 text-white'
        break
      case 'B':
        badgeClass = 'bg-green-500 text-white'
        break
      case 'C':
        badgeClass = 'bg-yellow-500 text-white'
        break
      case 'D':
        badgeClass = 'bg-orange-500 text-white'
        break
      case 'E':
        badgeClass = 'bg-red-400 text-white'
        break
      case 'F':
        badgeClass = 'bg-red-600 text-white'
        break
      case 'G':
        badgeClass = 'bg-red-800 text-white'
        break
      default:
        badgeClass = 'bg-gray-600 text-white'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
        {ratingUpper}
      </span>
    )
  }

  const getEPCRatingDisplay = (result: AddressResult, isSummary: boolean = false) => {
    // Use epcRecords if available (new format), otherwise fall back to legacy format
    const records = result.epcRecords || (result.epcRatings?.map(r => ({ address: r.address, rating: r.rating })) || [])
    
    if (isSummary && records.length > 1) {
      // Show summary for expandable rows
      return (
        <span className="text-sm text-gray-300">
          {records.length} EPC record{records.length !== 1 ? 's' : ''} found
        </span>
      )
    }
    
    // If multiple records and not summary, show all with addresses
    if (records.length > 1) {
      return (
        <div className="space-y-1">
          {records.map((epc, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {getEPCRatingBadge(epc.rating)}
              <span className="text-xs text-gray-400">{epc.address}</span>
            </div>
          ))}
        </div>
      )
    }
    
    // Single rating
    const rating = records[0]?.rating || result.epcRating
    return rating ? getEPCRatingBadge(rating) : null
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
                href="/analysis"
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
              Portfolio Address{' '}
              <span className="text-accent-red">Analysis</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-2">
              Analyze addresses to find full addresses, property types, and EPC ratings
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
            <h2 className="text-xl font-bold text-gray-50 mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent-red" />
              Address Input
            </h2>
            
            <div className="mb-6">
              <label htmlFor="addresses" className="block text-sm font-medium text-gray-300 mb-2">
                Enter addresses (one per line)
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Enter rough or incomplete addresses, one per line. The tool will find the full address and look up property type and EPC rating.
              </p>
              <textarea
                id="addresses"
                value={addresses}
                onChange={handleAddressesChange}
                placeholder="123 Main Street, London&#10;45 High Road, Manchester&#10;Flat 2, Birmingham"
                rows={12}
                disabled={loading}
                className="w-full px-4 py-3 bg-navy-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent font-mono text-sm resize-y disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-2">
                {addressCount} address(es) entered
              </p>
            </div>

            {/* Analyze Button */}
            <div className="mb-6">
              <button
                onClick={handleAnalyzeAddresses}
                disabled={loading || addressCount === 0}
                className="px-6 py-3 bg-accent-red text-white rounded-lg font-semibold hover:bg-accent-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? 'Analyzing Addresses...' : 'Analyze Addresses'}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
                <p className="text-red-300 font-semibold mb-1">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Results Display */}
            {results.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-50">
                    Results ({results.length} address{results.length !== 1 ? 'es' : ''})
                  </h3>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-red text-white rounded-lg font-semibold hover:bg-accent-red/90 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto border border-gray-700 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-navy-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Original Input
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Formalised Address
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          EPC Matched Address
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          EPC Rating
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Property Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Floor Area (m²)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-navy-900/50 divide-y divide-gray-700">
                      {results.map((result, index) => {
                        const epcRecords = result.epcRecords || (result.epcRatings?.map(r => ({ address: r.address, rating: r.rating, propertyType: result.propertyType, totalFloorArea: result.totalFloorArea })) || [])
                        const hasMultipleRecords = epcRecords.length > 1
                        const isExpanded = expandedRows.has(index)
                        const displayRecords = hasMultipleRecords && !isExpanded ? [] : epcRecords
                        const singleRecord = epcRecords.length === 1 ? epcRecords[0] : null
                        
                        return (
                          <>
                            {/* Main row */}
                            <tr key={index} className="hover:bg-navy-800/50">
                              <td className="px-4 py-3 text-sm text-gray-300">
                                {result.originalInput}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300">
                                {result.formattedAddress || (
                                  <span className="text-gray-500 italic">No match found</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300">
                                {hasMultipleRecords ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleRowExpansion(index)}
                                      className="flex items-center gap-2 hover:text-accent-red transition-colors"
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                      <span>{epcRecords.length} EPC record{epcRecords.length !== 1 ? 's' : ''}</span>
                                    </button>
                                  </div>
                                ) : singleRecord ? (
                                  singleRecord.address
                                ) : result.epcMatchedAddress ? (
                                  result.epcMatchedAddress
                                ) : (
                                  <span className="text-gray-500 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-2">
                                  {hasMultipleRecords ? (
                                    getEPCRatingDisplay(result, true)
                                  ) : (
                                    getEPCRatingDisplay(result)
                                  )}
                                  {singleRecord?.isExpired && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-900/50 text-red-300 border border-red-500/50">
                                      Expired
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300">
                                {singleRecord?.propertyType || result.propertyType || (
                                  <span className="text-gray-500 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300">
                                {singleRecord?.totalFloorArea || result.totalFloorArea ? (
                                  <span>{singleRecord?.totalFloorArea || result.totalFloorArea} m²</span>
                                ) : (
                                  <span className="text-gray-500 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                            {/* Expanded sub-rows for multiple EPC records */}
                            {hasMultipleRecords && isExpanded && epcRecords.map((record, recordIndex) => (
                              <tr key={`${index}-${recordIndex}`} className="bg-navy-800/30 hover:bg-navy-800/40">
                                <td className="px-4 py-2 text-sm text-gray-400"></td>
                                <td className="px-4 py-2 text-sm text-gray-400"></td>
                                <td className="px-4 py-2 text-sm text-gray-300 pl-8">
                                  <div className="flex items-center gap-2">
                                    {record.address}
                                    {record.isExpired && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-900/50 text-red-300 border border-red-500/50">
                                        Expired
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    {getEPCRatingBadge(record.rating)}
                                    {record.isExpired && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-900/50 text-red-300 border border-red-500/50">
                                        Expired
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-300">
                                  {record.propertyType || (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-300">
                                  {record.totalFloorArea ? (
                                    <span>{record.totalFloorArea} m²</span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && results.length === 0 && !error && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-base sm:text-lg md:text-xl">
                  Enter addresses above and click "Analyze Addresses" to find full addresses
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
