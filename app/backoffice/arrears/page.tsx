'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import Footer from '../../components/Footer'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
} from 'lucide-react'
import type { ArrearsProperty, ArrearsQueryResult } from '@/lib/notion-rent-log'
import { BackofficeToolbar } from '../BackofficeToolbar'

function formatGbp(value: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)
}

function propertySearchText(property: ArrearsProperty): string {
  return [property.label, property.flatRef, property.propertyAddress, property.doorNumber, property.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadCsv(properties: ArrearsProperty[], month: string, year: string) {
  const headers = [
    'Property',
    'Flat ref',
    'Door',
    'Address',
    'Months included',
    'Arrears',
    'Expected',
    'Gross received',
  ]
  const rows = properties.map((property) =>
    [
      property.label,
      property.flatRef,
      property.doorNumber,
      property.propertyAddress,
      property.monthCount,
      property.netBalance,
      property.expected,
      property.grossReceived,
    ]
      .map(csvEscape)
      .join(',')
  )
  const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `arrears-${year}-${month}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function ArrearsPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ArrearsQueryResult | null>(null)
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchArrears = useCallback(async (nextMonth?: string, nextYear?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (nextMonth) params.set('month', nextMonth)
      if (nextYear) params.set('year', nextYear)
      const response = await fetch(`/api/backoffice/arrears?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load arrears')
      }
      setData(payload)
      setMonth(payload.month)
      setYear(payload.year)
      setExpanded(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load arrears')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArrears()
  }, [fetchArrears])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/backoffice/logout', { method: 'POST' })
      if (response.ok) {
        router.push('/backoffice/login')
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const filteredProperties = useMemo(() => {
    if (!data) return []
    const query = search.trim().toLowerCase()
    if (!query) return data.properties
    return data.properties.filter((property) => propertySearchText(property).includes(query))
  }, [data, search])

  const toggleExpanded = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-navy-gradient px-4 md:px-0">
      <Navigation />

      <section className="px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-4">
        <div className="max-w-[1600px] mx-auto">
          <BackofficeToolbar
            title={
              <>
                Arrears <span className="text-accent-red">Tracking</span>
              </>
            }
            subtitle="Read-only balances from the rent log"
            left={
              <Link
                href="/backoffice"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-accent-red transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            }
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

          <div className="flex flex-wrap items-end justify-center gap-3 mb-4">
            <label className="text-sm text-gray-300">
              As of
              <span className="mt-1 flex gap-3">
                <select
                  value={month}
                  onChange={(e) => {
                    const next = e.target.value
                    setMonth(next)
                    fetchArrears(next, year)
                  }}
                  className="block min-w-[160px] rounded-lg bg-navy-900 border border-white/10 px-3 py-2 text-gray-50"
                  aria-label="As of month"
                >
                  {(data?.monthOptions || (month ? [month] : [])).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => {
                    const next = e.target.value
                    setYear(next)
                    fetchArrears(month, next)
                  }}
                  className="block min-w-[120px] rounded-lg bg-navy-900 border border-white/10 px-3 py-2 text-gray-50"
                  aria-label="As of year"
                >
                  {(data?.yearOptions || (year ? [year] : [])).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <button
              type="button"
              onClick={() => fetchArrears(month, year)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:border-accent-red/50 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {error && (
            <div className="rounded-2xl border border-accent-red/40 bg-accent-red/10 px-4 py-3 text-sm text-gray-100">
              {error}
            </div>
          )}

          {loading && !data ? (
            <div className="flex justify-center py-20 text-gray-300">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : data ? (
            <>
              {data.unscopedCount > 0 && (
                <p className="text-sm text-amber-300">
                  {data.unscopedCount} rent log {data.unscopedCount === 1 ? 'row has' : 'rows have'} no
                  month or year that can be ordered, so {data.unscopedCount === 1 ? 'it is' : 'they are'}{' '}
                  left out of these balances.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KpiCard
                  label="Properties in arrears"
                  value={String(data.totals.propertyCount)}
                  hint="Expected rent still above received"
                />
                <KpiCard
                  label="Total arrears"
                  value={formatGbp(data.totals.totalArrears)}
                  hint="Expected minus received, as of this month"
                  accent
                />
              </div>

              <div className="rounded-2xl border border-accent-red/20 bg-navy-900/50">
                <div className="p-4 md:p-5 border-b border-white/5 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between bg-navy-900/50">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search property, flat ref, address"
                      className="w-full rounded-lg bg-navy-950 border border-white/10 pl-9 pr-3 py-2 text-sm text-gray-50 placeholder:text-gray-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadCsv(filteredProperties, data.month, data.year)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-200 hover:border-accent-red/50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </div>

                {filteredProperties.length === 0 ? (
                  <p className="px-5 py-12 text-center text-sm text-gray-400">
                    {data.properties.length === 0
                      ? `No properties in arrears as of ${data.month} ${data.year}.`
                      : 'No properties match this search.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-b-2xl">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
                        <tr>
                          <th className="px-4 py-3 font-medium sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">
                            Property
                          </th>
                          <th className="px-4 py-3 font-medium text-right sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">
                            Months
                          </th>
                          <th className="px-4 py-3 font-medium text-right sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">
                            Arrears
                          </th>
                          <th className="px-4 py-3 font-medium sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProperties.map((property) => (
                          <PropertyRows
                            key={property.key}
                            property={property}
                            open={expanded.has(property.key)}
                            onToggle={() => toggleExpanded(property.key)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>

      <Footer />
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? 'border-accent-red/40 bg-accent-red/10' : 'border-accent-red/20 bg-navy-900/50'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-50 mt-2">{value}</p>
      <p className="text-xs text-gray-400 mt-2">{hint}</p>
    </div>
  )
}

function PropertyRows({
  property,
  open,
  onToggle,
}: {
  property: ArrearsProperty
  open: boolean
  onToggle: () => void
}) {
  const flatShown =
    property.flatRef && !property.label.toLowerCase().includes(property.flatRef.toLowerCase())

  return (
    <>
      <tr className="border-t border-white/5 hover:bg-white/5">
        <td className="px-4 py-3">
          <div className="text-gray-50 font-medium">
            {flatShown ? <span className="text-gray-400 mr-2">{property.flatRef}</span> : null}
            {property.label}
          </div>
          {property.name && property.name !== property.label && (
            <div className="text-xs text-gray-500">{property.name}</div>
          )}
        </td>
        <td className="px-4 py-3 text-right text-gray-200">{property.monthCount}</td>
        <td className="px-4 py-3 text-right font-semibold text-accent-red">
          {formatGbp(property.netBalance)}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white"
            aria-expanded={open}
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {open ? 'Hide months' : 'Months'}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-white/5 bg-navy-950/50">
          <td colSpan={4} className="px-4 py-3">
            <table className="min-w-full text-xs">
              <thead className="text-left uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Month</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Expected</th>
                  <th className="px-3 py-2 font-medium text-right">Received</th>
                  <th className="px-3 py-2 font-medium text-right">Missing</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {property.months.map((line) => (
                  <tr key={line.id} className="border-t border-white/5">
                    <td className="px-3 py-2 text-gray-200 whitespace-nowrap">
                      {line.month} {line.year}
                    </td>
                    <td className="px-3 py-2 text-gray-300">{line.status || 'Unknown'}</td>
                    <td className="px-3 py-2 text-right text-gray-200">{formatGbp(line.expected)}</td>
                    <td className="px-3 py-2 text-right text-gray-200">{formatGbp(line.grossReceived)}</td>
                    <td
                      className={`px-3 py-2 text-right ${line.missing > 0 ? 'text-accent-red' : 'text-gray-200'}`}
                    >
                      {formatGbp(line.missing)}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={line.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-gray-400 hover:text-accent-red"
                        title="Open in Notion"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}
