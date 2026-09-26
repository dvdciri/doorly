'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import Footer from '../../components/Footer'
import {
  ArrowLeft,
  Download,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import {
  MAX_MANUAL_NOTE_LENGTH,
  missingAmountOf,
  type RentLogEntry,
  type RentLogQueryResult,
} from '@/lib/notion-rent-log'
import { RentByPropertyChart, statusColor } from './RentCharts'
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

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function propertiesLabel(count: number): string {
  return `${count} ${count === 1 ? 'property' : 'properties'}`
}

function isStale(lastChecked: string | null): boolean {
  if (!lastChecked) return true
  const then = new Date(lastChecked).getTime()
  if (Number.isNaN(then)) return true
  return Date.now() - then > 14 * 24 * 60 * 60 * 1000
}

function outstandingOf(entry: RentLogEntry): number {
  return missingAmountOf(entry)
}

function matchesSearch(entry: RentLogEntry, query: string): boolean {
  if (!query) return true
  const haystack = [
    entry.name,
    entry.propertyAddress,
    entry.doorNumber,
    entry.notes,
    entry.manualNote,
    entry.flatRef,
    entry.source,
    entry.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadCsv(entries: RentLogEntry[], month: string, year: string) {
  const headers = [
    'Name',
    'Property Address',
    'Door',
    'Flat ref',
    'Status',
    'Expected',
    'Received Gross',
    'Received Net',
    'Expenses charged',
    'Missing amount',
    'Date received',
    'Notes',
    'Manual Note',
    'Source',
    'Notion URL',
  ]
  const rows = entries.map((entry) =>
    [
      entry.name,
      entry.propertyAddress,
      entry.doorNumber,
      entry.flatRef,
      entry.status,
      entry.expected,
      entry.grossReceived,
      entry.netReceived,
      entry.expensesCharged,
      entry.missingAmount,
      entry.dateReceived,
      entry.notes,
      entry.manualNote,
      entry.source,
      entry.url,
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
  link.download = `rent-log-${year}-${month}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

interface GroupedRows {
  key: string
  label: string
  entries: RentLogEntry[]
}

function blockKey(entry: RentLogEntry): string | null {
  if (!entry.flatRef?.trim()) return null
  const address = entry.propertyAddress?.trim()
  const door = entry.doorNumber?.trim()
  if (address && door) return `block:${address.toLowerCase()}|${door.toLowerCase()}`
  if (address) return `addr:${address.toLowerCase()}`
  const code = entry.name.match(/\b(P\d+)\b/i)?.[1]?.toUpperCase()
  if (code) return `code:${code}`
  return `flat:${entry.flatRef.trim().toLowerCase()}`
}

function blockLabel(entry: RentLogEntry): string {
  const address = entry.propertyAddress?.trim()
  const door = entry.doorNumber?.trim()
  if (address && door) return `${door} ${address}`
  if (address) return address
  const code = entry.name.match(/\b(P\d+)\b/i)?.[1]?.toUpperCase()
  return code || entry.flatRef?.trim() || 'Block'
}

function displayAddress(entry: RentLogEntry): string {
  const address = entry.propertyAddress?.trim()
  const door = entry.doorNumber?.trim()
  if (address && door) return `${door} ${address}`
  return address || entry.name
}

function groupEntries(entries: RentLogEntry[]): GroupedRows[] {
  const ungrouped: RentLogEntry[] = []
  const groups = new Map<string, RentLogEntry[]>()
  const labels = new Map<string, string>()

  for (const entry of entries) {
    const key = blockKey(entry)
    if (!key) {
      ungrouped.push(entry)
      continue
    }
    const list = groups.get(key) || []
    list.push(entry)
    groups.set(key, list)
    if (!labels.has(key)) labels.set(key, blockLabel(entry))
  }

  const grouped: GroupedRows[] = Array.from(groups.entries())
    .sort((a, b) => (labels.get(a[0]) || '').localeCompare(labels.get(b[0]) || ''))
    .map(([key, blockEntries]) => ({
      key,
      label: labels.get(key) || key,
      entries: [...blockEntries].sort((a, b) =>
        (a.flatRef || '').localeCompare(b.flatRef || '', undefined, { numeric: true })
      ),
    }))

  if (ungrouped.length > 0) {
    grouped.push({
      key: '__ungrouped',
      label: 'Houses & ungrouped',
      entries: ungrouped,
    })
  }

  return grouped
}

export default function RentCheckPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RentLogQueryResult | null>(null)
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const fetchRentLog = useCallback(async (nextMonth?: string, nextYear?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (nextMonth) params.set('month', nextMonth)
      if (nextYear) params.set('year', nextYear)
      const response = await fetch(`/api/backoffice/rent-check?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load rent log')
      }
      setData(payload)
      setMonth(payload.month)
      setYear(payload.year)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rent log')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleManualNoteSaved = useCallback((id: string, manualNote: string | null) => {
    setData((current) => {
      if (!current) return current
      return {
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === id ? { ...entry, manualNote } : entry
        ),
      }
    })
  }, [])

  useEffect(() => {
    fetchRentLog()
  }, [fetchRentLog])

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

  const filteredEntries = useMemo(() => {
    if (!data) return []
    const query = search.trim().toLowerCase()
    return data.entries.filter((entry) => {
      if (statusFilter && entry.status !== statusFilter) return false
      return matchesSearch(entry, query)
    })
  }, [data, search, statusFilter])

  const groups = useMemo(() => groupEntries(filteredEntries), [filteredEntries])

  const propertyChartItems = useMemo(
    () =>
      groups.flatMap((group) =>
        group.entries.map((entry) => ({
          id: entry.id,
          label: entry.flatRef?.trim()
            ? `${entry.flatRef.trim()} ${displayAddress(entry)}`
            : displayAddress(entry),
          expected: entry.expected,
          grossReceived: entry.grossReceived,
        }))
      ),
    [groups]
  )

  const columnTotals = useMemo(
    () =>
      filteredEntries.reduce(
        (totals, entry) => ({
          expected: totals.expected + entry.expected,
          grossReceived: totals.grossReceived + entry.grossReceived,
          netReceived: totals.netReceived + entry.netReceived,
          expensesCharged: totals.expensesCharged + entry.expensesCharged,
          missing: totals.missing + outstandingOf(entry),
        }),
        { expected: 0, grossReceived: 0, netReceived: 0, expensesCharged: 0, missing: 0 }
      ),
    [filteredEntries]
  )

  const statusChips = useMemo(() => {
    const names = data?.totals.statusSlices.map((slice) => slice.status) || []
    return ['All', ...names]
  }, [data])

  const lastChecked = data?.entries[0]?.lastChecked ?? null
  const lastCheckedStale = isStale(lastChecked)

  return (
    <div className="min-h-screen bg-navy-gradient px-4 md:px-0">
      <Navigation />

      <section className="px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-4">
        <div className="max-w-[1600px] mx-auto">
          <BackofficeToolbar
            title={
              <>
                Rent <span className="text-accent-red">Check</span>
              </>
            }
            subtitle="Live rent reports from Notion"
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
              Month
              <select
                value={month}
                onChange={(e) => {
                  const next = e.target.value
                  setMonth(next)
                  setStatusFilter(null)
                  fetchRentLog(next, year)
                }}
                className="mt-1 block min-w-[160px] rounded-lg bg-navy-900 border border-white/10 px-3 py-2 text-gray-50"
              >
                {(data?.monthOptions || (month ? [month] : [])).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-300">
              Year
              <select
                value={year}
                onChange={(e) => {
                  const next = e.target.value
                  setYear(next)
                  setStatusFilter(null)
                  fetchRentLog(month, next)
                }}
                className="mt-1 block min-w-[120px] rounded-lg bg-navy-900 border border-white/10 px-3 py-2 text-gray-50"
              >
                {(data?.yearOptions || (year ? [year] : [])).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => fetchRentLog(month, year)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:border-accent-red/50 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {data && (
              <p className="text-sm text-gray-400 self-center sm:self-end sm:pb-2">
                Last checked{' '}
                <span className={lastCheckedStale ? 'text-amber-400' : 'text-gray-200'}>
                  {formatDate(lastChecked)}
                  {lastCheckedStale ? ' · stale' : ''}
                </span>
              </p>
            )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <KpiCard
                  label="Expected gross"
                  value={formatGbp(data.totals.totalExpected)}
                  hint={propertiesLabel(data.totals.propertyCount)}
                />
                <KpiCard
                  label="Received in full"
                  value={formatGbp(data.totals.totalReceivedInFull)}
                  hint={`${propertiesLabel(data.totals.paidInFullCount)} paid in full`}
                />
                <KpiCard
                  label="Received partial"
                  value={formatGbp(data.totals.totalReceivedPartial)}
                  hint={`${propertiesLabel(data.totals.partialCount)} paid partially`}
                />
                <KpiCard
                  label="Net rent received"
                  value={formatGbp(data.totals.totalNetReceived)}
                  hint="Across all properties"
                />
                <KpiCard
                  label="Missing rent"
                  value={formatGbp(data.totals.totalMissingRent)}
                  hint={`${propertiesLabel(data.totals.unpaidCount)} unpaid + partial shortfalls`}
                  accent
                />
              </div>

              <div className="rounded-2xl border border-accent-red/20 bg-navy-900/50 p-5">
                <RentByPropertyChart items={propertyChartItems} />
              </div>

              <div className="rounded-2xl border border-accent-red/20 bg-navy-900/50">
                <div className="p-4 md:p-5 border-b border-white/5 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between bg-navy-900/50">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, address, notes, manual note, source, flat ref"
                      className="w-full rounded-lg bg-navy-950 border border-white/10 pl-9 pr-3 py-2 text-sm text-gray-50 placeholder:text-gray-500"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {statusChips.map((chip) => {
                      const active = chip === 'All' ? !statusFilter : statusFilter === chip
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setStatusFilter(chip === 'All' ? null : chip)}
                          className={`rounded-full px-3 py-1 text-xs border ${
                            active
                              ? 'border-accent-red/70 bg-accent-red/15 text-white'
                              : 'border-white/10 text-gray-300 hover:border-white/25'
                          }`}
                        >
                          {chip}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => downloadCsv(filteredEntries, data.month, data.year)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-200 hover:border-accent-red/50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {filteredEntries.length === 0 ? (
                  <p className="px-5 py-12 text-center text-sm text-gray-400">
                    No rent entries for this filter.
                  </p>
                ) : (
                  <div className="rounded-b-2xl">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
                        <tr>
                          <th className="px-4 py-3 font-medium sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Property</th>
                          <th className="px-4 py-3 font-medium sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Status</th>
                          <th className="px-4 py-3 font-medium text-right sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Expected</th>
                          <th className="px-4 py-3 font-medium text-right sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Received Gross</th>
                          <th className="px-4 py-3 font-medium text-right sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Received Net</th>
                          <th className="px-4 py-3 font-medium text-right sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Expenses charged</th>
                          <th className="px-4 py-3 font-medium text-right sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Missing</th>
                          <th className="px-4 py-3 font-medium sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Date received</th>
                          <th className="px-4 py-3 font-medium sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Notes</th>
                          <th className="px-4 py-3 font-medium sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Manual note</th>
                          <th className="px-4 py-3 font-medium sticky top-0 z-20 bg-navy-950 shadow-[0_1px_0_rgba(255,255,255,0.1)]">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((group) => (
                          <GroupRows
                            key={group.key}
                            group={group}
                            onManualNoteSaved={handleManualNoteSaved}
                          />
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/20 bg-navy-950/80 font-semibold text-gray-50">
                          <td className="px-4 py-3" colSpan={2}>Total</td>
                          <td className="px-4 py-3 text-right">{formatGbp(columnTotals.expected)}</td>
                          <td className="px-4 py-3 text-right">{formatGbp(columnTotals.grossReceived)}</td>
                          <td className="px-4 py-3 text-right">{formatGbp(columnTotals.netReceived)}</td>
                          <td className="px-4 py-3 text-right">{formatGbp(columnTotals.expensesCharged)}</td>
                          <td className={`px-4 py-3 text-right ${columnTotals.missing > 0 ? 'text-accent-red' : ''}`}>
                            {formatGbp(columnTotals.missing)}
                          </td>
                          <td colSpan={4} />
                        </tr>
                      </tfoot>
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

function NotesCell({
  notes,
  title,
  heading = 'Notes',
  emptyLabel = '—',
  openLabel = 'View notes',
}: {
  notes: string | null
  title: string
  heading?: string
  emptyLabel?: string
  openLabel?: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!notes) {
    return <span className="text-gray-500">{emptyLabel}</span>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-accent-red hover:text-accent-red/80 underline underline-offset-2 whitespace-nowrap"
      >
        {openLabel}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rent-note-title"
            className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl border border-accent-red/30 bg-navy-900 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">{heading}</p>
                <h3 id="rent-note-title" className="text-base font-semibold text-gray-50 mt-1">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white p-1"
                aria-label={`Close ${heading.toLowerCase()}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto scrollbar-subtle whitespace-pre-wrap text-sm text-gray-200 leading-relaxed">
              {notes}
            </div>
          </div>
        </div>
      )}
    </>
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
        accent
          ? 'border-accent-red/40 bg-accent-red/10'
          : 'border-accent-red/20 bg-navy-900/50'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-50 mt-2">{value}</p>
      <p className="text-xs text-gray-400 mt-2">{hint}</p>
    </div>
  )
}

function ManualNoteCell({
  entry,
  onSaved,
}: {
  entry: RentLogEntry
  onSaved: (id: string, manualNote: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entry.manualNote || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const title = displayAddress(entry)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
    }
  }, [open, saving])

  const openDialog = () => {
    setDraft(entry.manualNote || '')
    setError(null)
    setEditing(!entry.manualNote)
    setOpen(true)
  }

  const save = async () => {
    if (draft.trim().length > MAX_MANUAL_NOTE_LENGTH) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/backoffice/rent-check/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualNote: draft }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save manual note')
      }
      onSaved(entry.id, payload.manualNote ?? null)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save manual note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="text-sm text-accent-red hover:text-accent-red/80 underline underline-offset-2 whitespace-nowrap"
      >
        {entry.manualNote ? 'View note' : 'Add note'}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80"
          onClick={() => {
            if (!saving) setOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-note-title"
            className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl border border-accent-red/30 bg-navy-900 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Manual note</p>
                <h3 id="manual-note-title" className="text-base font-semibold text-gray-50 mt-1">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="text-gray-400 hover:text-white p-1 disabled:opacity-50"
                aria-label="Close manual note"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {editing ? (
              <div className="p-5 space-y-3">
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={5}
                  maxLength={MAX_MANUAL_NOTE_LENGTH}
                  placeholder="Add a note for this entry"
                  className="w-full rounded-lg bg-navy-950 border border-white/10 px-3 py-2 text-sm text-gray-50 placeholder:text-gray-500 resize-y"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    {draft.trim().length}/{MAX_MANUAL_NOTE_LENGTH}
                    {error ? <span className="text-accent-red ml-2">{error}</span> : null}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (entry.manualNote) {
                          setDraft(entry.manualNote)
                          setError(null)
                          setEditing(false)
                        } else {
                          setOpen(false)
                        }
                      }}
                      disabled={saving}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:text-white disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent-red px-3 py-1.5 text-sm text-white hover:bg-accent-red/90 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="p-5 overflow-y-auto scrollbar-subtle whitespace-pre-wrap text-sm text-gray-200 leading-relaxed">
                  {entry.manualNote}
                </div>
                <div className="px-5 pb-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(entry.manualNote || '')
                      setError(null)
                      setEditing(true)
                    }}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-200 hover:border-accent-red/50"
                  >
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function GroupRows({
  group,
  onManualNoteSaved,
}: {
  group: GroupedRows
  onManualNoteSaved: (id: string, manualNote: string | null) => void
}) {
  const nested = group.key !== '__ungrouped' && group.entries.length > 0

  return (
    <>
      <tr className="bg-navy-950/80 border-t border-white/5">
        <td colSpan={11} className="px-4 py-2">
          <span className="text-xs font-semibold text-gray-200">
            {group.label}
          </span>
        </td>
      </tr>
      {group.entries.map((entry) => {
        const short = outstandingOf(entry)
        return (
          <tr key={entry.id} className="border-t border-white/5 hover:bg-white/5">
            <td className={`px-4 py-3 ${nested ? 'pl-8' : ''}`}>
              <div className="text-gray-50 font-medium">
                {nested && entry.flatRef ? (
                  <span className="text-gray-400 mr-2">{entry.flatRef}</span>
                ) : null}
                {displayAddress(entry)}
              </div>
            </td>
            <td className="px-4 py-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs border border-white/10"
                style={{ color: statusColor(entry.status) }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: statusColor(entry.status) }}
                />
                {entry.status || 'Unknown'}
              </span>
            </td>
            <td className="px-4 py-3 text-right text-gray-200">{formatGbp(entry.expected)}</td>
            <td className="px-4 py-3 text-right text-gray-200">{formatGbp(entry.grossReceived)}</td>
            <td className="px-4 py-3 text-right text-gray-200">{formatGbp(entry.netReceived)}</td>
            <td className="px-4 py-3 text-right text-gray-200">{formatGbp(entry.expensesCharged)}</td>
            <td className={`px-4 py-3 text-right ${short > 0 ? 'text-accent-red' : 'text-gray-200'}`}>
              {formatGbp(entry.missingAmount ?? short)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-gray-300">
              {formatDate(entry.dateReceived)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <NotesCell
                notes={entry.notes}
                title={displayAddress(entry)}
                openLabel="View notes"
              />
            </td>
            <td className="px-4 py-3">
              <ManualNoteCell entry={entry} onSaved={onManualNoteSaved} />
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <NotesCell
                notes={entry.source}
                title={displayAddress(entry)}
                heading="Source"
                openLabel="View source"
              />
            </td>
          </tr>
        )
      })}
    </>
  )
}
