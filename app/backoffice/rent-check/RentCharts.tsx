'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

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

export interface PropertyRentPoint {
  id: string
  label: string
  expected: number
  grossReceived: number
}

const MIN_PX_PER_PROPERTY = 56

export function RentByPropertyChart({ items }: { items: PropertyRentPoint[] }) {
  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-gray-200 mb-1">Expected vs received by property</h3>
      <p className="text-xs text-gray-400 mb-4">Expected rent and gross received for each property</p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">No properties for this filter</p>
      ) : (
        <div className="overflow-x-auto scrollbar-subtle">
          <div style={{ minWidth: items.length * MIN_PX_PER_PROPERTY, height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={items} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} barGap={2}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="id"
                  tickFormatter={(id) => items.find((item) => item.id === id)?.label ?? ''}
                  interval={0}
                  angle={-40}
                  textAnchor="end"
                  height={110}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                />
                <YAxis
                  tickFormatter={(value) => formatGbp(Number(value || 0))}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  labelFormatter={(id) => items.find((item) => item.id === id)?.label ?? ''}
                  formatter={(value) => formatGbp(Number(value || 0))}
                  contentStyle={{
                    background: '#0f2744',
                    border: '1px solid rgba(234,75,75,0.3)',
                    borderRadius: 8,
                    color: '#f9fafb',
                  }}
                />
                <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: '#d1d5db' }} />
                <Bar dataKey="expected" name="Expected" fill={STATUS_COLORS.Expected} radius={[3, 3, 0, 0]} />
                <Bar
                  dataKey="grossReceived"
                  name="Received Gross"
                  fill={STATUS_COLORS.Received}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
