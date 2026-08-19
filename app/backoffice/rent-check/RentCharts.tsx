'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { RentLogStatusSlice } from '@/lib/notion-rent-log'

const STATUS_COLORS: Record<string, string> = {
  Received: '#34d399',
  Partial: '#fbbf24',
  Late: '#fb923c',
  Expected: '#60a5fa',
  Missing: '#ea4b4b',
  Unknown: '#829ab1',
}

function formatGbp(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)
}

export function statusColor(status: string | null): string {
  if (!status) return STATUS_COLORS.Unknown
  return STATUS_COLORS[status] || STATUS_COLORS.Unknown
}

export function RentStatusChart({
  slices,
  totalGross,
  selectedStatus,
  onSelectStatus,
}: {
  slices: RentLogStatusSlice[]
  totalGross: number
  selectedStatus: string | null
  onSelectStatus: (status: string | null) => void
}) {
  const data = slices.filter(
    (slice) => slice.expected > 0 || slice.grossReceived > 0 || slice.count > 0
  )

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-200 mb-1">Expected rent by status</h3>
      <p className="text-xs text-gray-400 mb-4">
        Click a slice to filter the table. Centre is total gross received.
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 m-auto">No amounts for this period</p>
      ) : (
        <div className="flex-1 min-h-[220px] grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="relative h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="expected"
                  nameKey="status"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  onClick={(entry) => {
                    const status = typeof entry.name === 'string' ? entry.name : null
                    if (!status) return
                    onSelectStatus(selectedStatus === status ? null : status)
                  }}
                >
                  {data.map((slice) => (
                    <Cell
                      key={slice.status}
                      fill={statusColor(slice.status)}
                      opacity={selectedStatus && selectedStatus !== slice.status ? 0.35 : 1}
                      cursor="pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatGbp(Number(value || 0))}
                  contentStyle={{
                    background: '#0f2744',
                    border: '1px solid rgba(234,75,75,0.3)',
                    borderRadius: 8,
                    color: '#f9fafb',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase tracking-wide text-gray-400">Gross</span>
              <span className="text-sm font-semibold text-gray-50">{formatGbp(totalGross)}</span>
            </div>
          </div>
          <ul className="space-y-2">
            {slices.map((slice) => (
              <li key={slice.status}>
                <button
                  type="button"
                  onClick={() =>
                    onSelectStatus(selectedStatus === slice.status ? null : slice.status)
                  }
                  className={`w-full text-left rounded-lg px-3 py-2 border transition-colors ${
                    selectedStatus === slice.status
                      ? 'border-accent-red/60 bg-accent-red/10'
                      : 'border-white/5 bg-navy-950/40 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm text-gray-200">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: statusColor(slice.status) }}
                      />
                      {slice.status}
                    </span>
                    <span className="text-sm text-gray-50">{formatGbp(slice.expected)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {slice.count} {slice.count === 1 ? 'property' : 'properties'} · gross{' '}
                    {formatGbp(slice.grossReceived)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function RentShortfallChart({
  items,
}: {
  items: { label: string; outstanding: number }[]
}) {
  const max = Math.max(...items.map((item) => item.outstanding), 1)

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-200 mb-1">Largest missing amounts</h3>
      <p className="text-xs text-gray-400 mb-4">Shortfalls and extra charges to chase</p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 m-auto">Nothing missing this period</p>
      ) : (
        <ul className="space-y-3 overflow-auto max-h-[260px] scrollbar-subtle pr-1">
          {items.map((item) => (
            <li key={item.label}>
              <div className="flex justify-between gap-3 text-xs mb-1">
                <span className="text-gray-300 truncate">{item.label}</span>
                <span className="text-accent-red shrink-0">{formatGbp(item.outstanding)}</span>
              </div>
              <div className="h-2 rounded-full bg-navy-950/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-red/80"
                  style={{ width: `${Math.max((item.outstanding / max) * 100, 4)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
