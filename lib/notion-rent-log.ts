import { notionFetch } from '@/lib/notion'

export interface RentLogEntry {
  id: string
  name: string
  propertyAddress: string | null
  dateReceived: string | null
  month: string | null
  year: string | null
  status: string | null
  expected: number
  grossReceived: number
  netReceived: number
  expensesCharged: number
  missingAmount: number | null
  notes: string | null
  manualNote: string | null
  lastChecked: string | null
  flatRef: string | null
  doorNumber: string | null
  source: string | null
  url: string
}

export interface RentLogStatusSlice {
  status: string
  grossReceived: number
  expected: number
  count: number
}

export interface RentLogTotals {
  totalExpected: number
  totalGrossReceived: number
  totalNetReceived: number
  totalMissingAmount: number
  totalReceivedInFull: number
  totalReceivedPartial: number
  totalMissingRent: number
  paidInFullCount: number
  partialCount: number
  unpaidCount: number
  propertyCount: number
  statusCounts: Record<string, number>
  statusSlices: RentLogStatusSlice[]
}

export interface RentLogQueryResult {
  month: string
  year: string
  monthOptions: string[]
  yearOptions: string[]
  entries: RentLogEntry[]
  totals: RentLogTotals
}

export interface ArrearsMonthLine {
  id: string
  month: string
  year: string
  status: string | null
  expected: number
  grossReceived: number
  missing: number
  url: string
}

export interface ArrearsProperty {
  key: string
  label: string
  flatRef: string | null
  doorNumber: string | null
  propertyAddress: string | null
  name: string
  monthCount: number
  netBalance: number
  expected: number
  grossReceived: number
  months: ArrearsMonthLine[]
}

export interface ArrearsTotals {
  propertyCount: number
  totalArrears: number
}

export interface ArrearsQueryResult {
  month: string
  year: string
  monthOptions: string[]
  yearOptions: string[]
  unscopedCount: number
  properties: ArrearsProperty[]
  totals: ArrearsTotals
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const MAX_MANUAL_NOTE_LENGTH = 2000

function sameNotionId(a: string, b: string): boolean {
  return a.replace(/-/g, '').toLowerCase() === b.replace(/-/g, '').toLowerCase()
}

function getRentLogDatabaseId(): string {
  const databaseId = process.env.NOTION_RENT_LOG_DATABASE_ID
  if (!databaseId) {
    throw new Error('NOTION_RENT_LOG_DATABASE_ID is not configured')
  }
  return databaseId
}

function extractPlain(items: any[] | undefined): string | null {
  if (!items?.length) return null
  return items.map((item: any) => item.plain_text || '').join('').trim() || null
}

function extractText(property: any): string | null {
  if (!property) return null
  if (property.type === 'title') return extractPlain(property.title)
  if (property.type === 'rich_text') return extractPlain(property.rich_text)
  if (property.type === 'rollup') {
    if (property.rollup?.type === 'string') {
      return property.rollup.string?.trim() || null
    }
    if (property.rollup?.type === 'array') {
      const parts = (property.rollup.array || [])
        .map((item: any) => extractText(item))
        .filter(Boolean)
      return parts.length ? parts.join(', ') : null
    }
  }
  return null
}

function extractSelectOrFormula(property: any): string | null {
  if (!property) return null
  if (property.type === 'select') {
    return property.select?.name ?? null
  }
  if (property.type === 'formula') {
    if (property.formula?.type === 'string') {
      return property.formula.string || null
    }
    if (property.formula?.type === 'number' && property.formula.number != null) {
      return String(property.formula.number)
    }
  }
  if (property.type === 'number' && property.number != null) {
    return String(property.number)
  }
  return null
}

function extractDate(property: any): string | null {
  return property?.date?.start ?? null
}

function extractNumber(property: any): number | null {
  if (!property) return null
  if (property.type === 'number') {
    return typeof property.number === 'number' ? property.number : null
  }
  if (property.type === 'formula') {
    if (property.formula?.type === 'number' && typeof property.formula.number === 'number') {
      return property.formula.number
    }
  }
  return null
}

function extractRelationIds(property: any): string[] {
  if (property?.type !== 'relation' || !Array.isArray(property.relation)) return []
  return property.relation.map((item: any) => item.id).filter(Boolean)
}

/** "Flat A, 542" -> "542"; "32" -> "32"; "31b" -> "31b" */
export function buildingDoorNumber(door: string | null): string | null {
  if (!door?.trim()) return null
  const stripped = door.replace(/^flat\s+[^,]+,\s*/i, '').trim()
  return stripped || door.trim()
}

function asAmount(value: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function getSelectOptions(property: any): string[] {
  const options: string[] = []
  if (property?.type === 'select' && property.select?.options) {
    for (const option of property.select.options) {
      if (option.name) options.push(option.name)
    }
  }
  return options
}

export function currentMonthName(): string {
  return MONTH_NAMES[new Date().getMonth()]
}

export function currentYearName(): string {
  return String(new Date().getFullYear())
}

export function matchOption(preferred: string, options: string[]): string {
  if (options.length === 0) return preferred
  const needle = preferred.toLowerCase()
  const exact = options.find((option) => option.toLowerCase() === needle)
  if (exact) return exact

  const contained = options.find(
    (option) => option.toLowerCase().includes(needle) || needle.includes(option.toLowerCase())
  )
  if (contained) return contained

  const monthIndex = MONTH_NAMES.findIndex((name) => name.toLowerCase() === needle)
  if (monthIndex >= 0) {
    const prefix = `${monthIndex + 1}.`
    const byNumber = options.find((option) => option.trim().startsWith(prefix))
    if (byNumber) return byNumber
  }

  return options[0]
}

function propertyByName(properties: Record<string, any>, names: string[]): any {
  for (const name of names) {
    if (properties[name]) return properties[name]
  }
  const keys = Object.keys(properties)
  for (const name of names) {
    const match = keys.find((key) => key.toLowerCase() === name.toLowerCase())
    if (match) return properties[match]
  }
  return null
}

export function parseRentLogPage(page: any): RentLogEntry & { propertyRefId: string | null } {
  const properties = page.properties || {}
  const relationIds = extractRelationIds(propertyByName(properties, ['Property Ref']))

  return {
    id: page.id,
    name: extractText(propertyByName(properties, ['Name'])) || 'Untitled',
    propertyAddress: extractText(propertyByName(properties, ['Property Address'])),
    dateReceived: extractDate(propertyByName(properties, ['Date received'])),
    month: extractSelectOrFormula(propertyByName(properties, ['Month'])),
    year: extractSelectOrFormula(propertyByName(properties, ['Year'])),
    status: extractSelectOrFormula(propertyByName(properties, ['Status'])),
    expected: asAmount(extractNumber(propertyByName(properties, ['Expected']))),
    grossReceived: asAmount(extractNumber(propertyByName(properties, ['Gross Received']))),
    netReceived: asAmount(extractNumber(propertyByName(properties, ['Net Received']))),
    expensesCharged: asAmount(extractNumber(propertyByName(properties, ['Expenses charged']))),
    missingAmount: extractNumber(propertyByName(properties, ['Missing amount'])),
    notes: extractText(propertyByName(properties, ['Notes'])),
    manualNote: extractText(propertyByName(properties, ['Manual Note'])),
    lastChecked: extractDate(propertyByName(properties, ['Last checked'])),
    flatRef: extractText(propertyByName(properties, ['Flat ref'])),
    doorNumber: null,
    source: extractText(propertyByName(properties, ['Source'])),
    propertyRefId: relationIds[0] || null,
    url: page.url || `https://notion.so/${page.id.replace(/-/g, '')}`,
  }
}

async function withDoorNumbers(
  entries: Array<RentLogEntry & { propertyRefId: string | null }>
): Promise<Array<RentLogEntry & { propertyRefId: string | null }>> {
  const ids = [...new Set(entries.map((entry) => entry.propertyRefId).filter(Boolean))] as string[]
  const doors = new Map<string, string | null>()

  await Promise.all(
    ids.map(async (id) => {
      try {
        const page = await notionFetch(`/pages/${id}`)
        const properties = page.properties || {}
        const rawDoor = extractText(propertyByName(properties, ['Door #']))
        doors.set(id, buildingDoorNumber(rawDoor))
      } catch (error) {
        console.error('Failed to resolve property door number', id, error)
        doors.set(id, null)
      }
    })
  )

  return entries.map((entry) => ({
    ...entry,
    doorNumber: entry.propertyRefId ? buildingDoorNumber(doors.get(entry.propertyRefId) || null) : null,
  }))
}

async function resolveDoorNumbers(
  entries: Array<RentLogEntry & { propertyRefId: string | null }>
): Promise<RentLogEntry[]> {
  const withDoors = await withDoorNumbers(entries)
  return withDoors.map(({ propertyRefId: _propertyRefId, ...entry }) => entry)
}

export async function updateRentLogManualNote(
  pageId: string,
  note: string
): Promise<string | null> {
  const trimmed = note.trim()
  if (trimmed.length > MAX_MANUAL_NOTE_LENGTH) {
    throw new Error(`Manual note must be ${MAX_MANUAL_NOTE_LENGTH} characters or fewer`)
  }

  const databaseId = getRentLogDatabaseId()
  const page = await notionFetch(`/pages/${pageId}`)
  const parentId = page.parent?.type === 'database_id' ? page.parent.database_id : null
  if (!parentId || !sameNotionId(parentId, databaseId)) {
    throw new Error('That entry is not in the rent log')
  }

  const updated = await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      properties: {
        'Manual Note': {
          rich_text: trimmed ? [{ text: { content: trimmed } }] : [],
        },
      },
    }),
  })

  return extractText(propertyByName(updated.properties || {}, ['Manual Note']))
}

export function missingAmountOf(entry: RentLogEntry): number {
  if (entry.missingAmount != null) return asAmount(entry.missingAmount)
  return Math.max(entry.expected - entry.grossReceived, 0)
}

export function computeRentLogTotals(entries: RentLogEntry[]): RentLogTotals {
  const statusMap = new Map<string, RentLogStatusSlice>()
  let totalExpected = 0
  let totalGrossReceived = 0
  let totalNetReceived = 0
  let totalMissingAmount = 0
  let totalReceivedInFull = 0
  let totalReceivedPartial = 0
  let totalMissingRent = 0
  let paidInFullCount = 0
  let partialCount = 0
  let unpaidCount = 0

  for (const entry of entries) {
    totalExpected += entry.expected
    totalGrossReceived += entry.grossReceived
    totalNetReceived += entry.netReceived
    totalMissingAmount += missingAmountOf(entry)

    if (entry.grossReceived <= 0) {
      if (entry.expected > 0) {
        unpaidCount += 1
        totalMissingRent += entry.expected
      }
    } else if (entry.grossReceived >= entry.expected) {
      paidInFullCount += 1
      totalReceivedInFull += entry.grossReceived
    } else {
      partialCount += 1
      totalReceivedPartial += entry.grossReceived
      totalMissingRent += entry.expected - entry.grossReceived
    }

    const status = entry.status?.trim() || 'Unknown'
    const existing = statusMap.get(status) || {
      status,
      grossReceived: 0,
      expected: 0,
      count: 0,
    }
    existing.grossReceived += entry.grossReceived
    existing.expected += entry.expected
    existing.count += 1
    statusMap.set(status, existing)
  }

  const preferredOrder = ['Received', 'Partial', 'Late', 'Expected', 'Missing']
  const statusSlices = Array.from(statusMap.values()).sort((a, b) => {
    const ai = preferredOrder.indexOf(a.status)
    const bi = preferredOrder.indexOf(b.status)
    if (ai === -1 && bi === -1) return a.status.localeCompare(b.status)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const statusCounts: Record<string, number> = {}
  for (const slice of statusSlices) {
    statusCounts[slice.status] = slice.count
  }

  return {
    totalExpected: roundMoney(totalExpected),
    totalGrossReceived: roundMoney(totalGrossReceived),
    totalNetReceived: roundMoney(totalNetReceived),
    totalMissingAmount: roundMoney(totalMissingAmount),
    totalReceivedInFull: roundMoney(totalReceivedInFull),
    totalReceivedPartial: roundMoney(totalReceivedPartial),
    totalMissingRent: roundMoney(totalMissingRent),
    paidInFullCount,
    partialCount,
    unpaidCount,
    propertyCount: entries.length,
    statusCounts,
    statusSlices,
  }
}

function buildPeriodFilter(
  monthProperty: any,
  yearProperty: any,
  month: string,
  year: string
): Record<string, any> {
  const conditions: Record<string, any>[] = []

  if (monthProperty?.type === 'select') {
    conditions.push({ property: monthProperty.name, select: { equals: month } })
  } else if (monthProperty?.type === 'formula') {
    conditions.push({ property: monthProperty.name, formula: { string: { equals: month } } })
  }

  if (yearProperty?.type === 'select') {
    conditions.push({ property: yearProperty.name, select: { equals: year } })
  } else if (yearProperty?.type === 'formula') {
    conditions.push({
      property: yearProperty.name,
      formula: { string: { equals: year } },
    })
  }

  if (conditions.length === 1) return conditions[0]
  return { and: conditions }
}

export async function queryRentLog(month?: string, year?: string): Promise<RentLogQueryResult> {
  const databaseId = getRentLogDatabaseId()
  const database = await notionFetch(`/databases/${databaseId}`)
  const properties = database.properties || {}

  const monthProperty = propertyByName(properties, ['Month'])
  const yearProperty = propertyByName(properties, ['Year'])

  const monthOptions = getSelectOptions(monthProperty)
  const yearOptions = getSelectOptions(yearProperty)

  const resolvedMonth = matchOption(month || currentMonthName(), monthOptions.length ? monthOptions : [currentMonthName()])
  const resolvedYear = matchOption(year || currentYearName(), yearOptions.length ? yearOptions : [currentYearName()])

  const rawEntries: Array<RentLogEntry & { propertyRefId: string | null }> = []
  let startCursor: string | undefined
  const filter = buildPeriodFilter(
    monthProperty ? { ...monthProperty, name: Object.keys(properties).find((k) => properties[k] === monthProperty) || 'Month' } : null,
    yearProperty ? { ...yearProperty, name: Object.keys(properties).find((k) => properties[k] === yearProperty) || 'Year' } : null,
    resolvedMonth,
    resolvedYear
  )

  do {
    const body: Record<string, any> = {
      page_size: 100,
      filter,
    }

    if (startCursor) {
      body.start_cursor = startCursor
    }

    const data = await notionFetch(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    for (const page of data.results || []) {
      rawEntries.push(parseRentLogPage(page))
    }

    startCursor = data.has_more ? data.next_cursor : undefined
  } while (startCursor)

  const entries = await resolveDoorNumbers(rawEntries)

  entries.sort((a, b) => {
    const flatA = a.flatRef || ''
    const flatB = b.flatRef || ''
    if (flatA !== flatB) return flatA.localeCompare(flatB)
    return (a.propertyAddress || a.name).localeCompare(b.propertyAddress || b.name)
  })

  return {
    month: resolvedMonth,
    year: resolvedYear,
    monthOptions: monthOptions.length ? monthOptions : MONTH_NAMES,
    yearOptions: yearOptions.length ? yearOptions : [resolvedYear, currentYearName()].filter((v, i, arr) => arr.indexOf(v) === i),
    entries,
    totals: computeRentLogTotals(entries),
  }
}

/** Calendar index for a rent-log month/year, or null when the period cannot be ordered. */
export function periodIndex(month: string | null, year: string | null): number | null {
  const monthIndex = monthIndexOf(month)
  const yearNumber = yearNumberOf(year)
  if (monthIndex == null || yearNumber == null) return null
  return yearNumber * 12 + monthIndex
}

function monthIndexOf(month: string | null): number | null {
  if (!month?.trim()) return null
  const trimmed = month.trim()
  const exact = MONTH_NAMES.findIndex((name) => name.toLowerCase() === trimmed.toLowerCase())
  if (exact >= 0) return exact

  const numbered = trimmed.match(/^(\d{1,2})\b/)
  if (numbered) {
    const value = Number(numbered[1])
    if (value >= 1 && value <= 12) return value - 1
  }

  const contained = MONTH_NAMES.findIndex((name) => trimmed.toLowerCase().includes(name.toLowerCase()))
  if (contained >= 0) return contained
  return null
}

function yearNumberOf(year: string | null): number | null {
  if (!year?.trim()) return null
  const match = year.match(/\d{4}/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

function normaliseKeyPart(value: string | null | undefined): string | null {
  const text = value?.trim().replace(/\s+/g, ' ').toLowerCase()
  return text || null
}

/** Mirrors Rent Check: a block is address + door (or the P-code), and each flat ref within it is its own unit. */
function arrearsPropertyKey(entry: RentLogEntry & { propertyRefId: string | null }): string {
  const flat = normaliseKeyPart(entry.flatRef)
  const address = normaliseKeyPart(entry.propertyAddress)
  const door = normaliseKeyPart(entry.doorNumber)
  const code = entry.name.match(/\b(P\d+)\b/i)?.[1]?.toLowerCase() ?? null

  let block: string | null = null
  if (address && door) block = `block:${address}|${door}`
  else if (address) block = `addr:${address}`
  else if (code) block = `code:${code}`
  else if (entry.propertyRefId) block = `ref:${entry.propertyRefId}`

  if (flat) return `${block ?? 'flat'}|flat:${flat}`
  if (block) return block
  return `name:${normaliseKeyPart(entry.name) || entry.id}`
}

function arrearsPlaceLabel(entry: RentLogEntry): string {
  const address = entry.propertyAddress?.trim()
  const door = entry.doorNumber?.trim()
  if (address && door) return `${door} ${address}`
  return address || entry.name
}

export function aggregateArrears(
  entries: Array<RentLogEntry & { propertyRefId: string | null }>,
  cutoff: number
): { properties: ArrearsProperty[]; unscopedCount: number } {
  let unscopedCount = 0
  const groups = new Map<string, Array<RentLogEntry & { propertyRefId: string | null }>>()

  for (const entry of entries) {
    const index = periodIndex(entry.month, entry.year)
    if (index == null) {
      unscopedCount += 1
      continue
    }
    if (index > cutoff) continue

    const key = arrearsPropertyKey(entry)
    const list = groups.get(key) || []
    list.push(entry)
    groups.set(key, list)
  }

  const properties: ArrearsProperty[] = []
  for (const [key, rows] of groups) {
    const sorted = [...rows].sort((a, b) => {
      const ai = periodIndex(a.month, a.year) ?? 0
      const bi = periodIndex(b.month, b.year) ?? 0
      if (ai !== bi) return ai - bi
      return a.id.localeCompare(b.id)
    })
    const latest = sorted[sorted.length - 1]
    let expected = 0
    let grossReceived = 0
    const months: ArrearsMonthLine[] = sorted.map((row) => {
      const missing = missingAmountOf(row)
      expected += row.expected
      grossReceived += row.grossReceived
      return {
        id: row.id,
        month: row.month || '',
        year: row.year || '',
        status: row.status,
        expected: roundMoney(row.expected),
        grossReceived: roundMoney(row.grossReceived),
        missing: roundMoney(missing),
        url: row.url,
      }
    })

    const netBalance = roundMoney(expected - grossReceived)
    if (netBalance <= 0) continue

    properties.push({
      key,
      label: arrearsPlaceLabel(latest),
      flatRef: latest.flatRef,
      doorNumber: latest.doorNumber,
      propertyAddress: latest.propertyAddress,
      name: latest.name,
      monthCount: months.length,
      netBalance,
      expected: roundMoney(expected),
      grossReceived: roundMoney(grossReceived),
      months,
    })
  }

  properties.sort((a, b) => {
    if (b.netBalance !== a.netBalance) return b.netBalance - a.netBalance
    return a.label.localeCompare(b.label)
  })

  return { properties, unscopedCount }
}

function computeArrearsTotals(properties: ArrearsProperty[]): ArrearsTotals {
  const totalArrears = properties.reduce((sum, property) => sum + property.netBalance, 0)
  return {
    propertyCount: properties.length,
    totalArrears: roundMoney(totalArrears),
  }
}

async function queryAllRentLogPages(databaseId: string): Promise<any[]> {
  const pages: any[] = []
  let startCursor: string | undefined

  do {
    const body: Record<string, any> = { page_size: 100 }
    if (startCursor) body.start_cursor = startCursor

    const data = await notionFetch(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    for (const page of data.results || []) {
      pages.push(page)
    }

    startCursor = data.has_more ? data.next_cursor : undefined
  } while (startCursor)

  return pages
}

export async function queryRentArrears(month?: string, year?: string): Promise<ArrearsQueryResult> {
  const databaseId = getRentLogDatabaseId()
  const database = await notionFetch(`/databases/${databaseId}`)
  const databaseProperties = database.properties || {}

  const monthOptions = getSelectOptions(propertyByName(databaseProperties, ['Month']))
  const yearOptions = getSelectOptions(propertyByName(databaseProperties, ['Year']))

  const resolvedMonth = matchOption(
    month || currentMonthName(),
    monthOptions.length ? monthOptions : [currentMonthName()]
  )
  const resolvedYear = matchOption(
    year || currentYearName(),
    yearOptions.length ? yearOptions : [currentYearName()]
  )

  const cutoff = periodIndex(resolvedMonth, resolvedYear)
  if (cutoff == null) {
    throw new Error(`Cannot order the selected period ${resolvedMonth} ${resolvedYear}`)
  }

  const pages = await queryAllRentLogPages(databaseId)
  const rawEntries = pages.map((page) => parseRentLogPage(page))
  const entries = await withDoorNumbers(rawEntries)
  const { properties, unscopedCount } = aggregateArrears(entries, cutoff)

  return {
    month: resolvedMonth,
    year: resolvedYear,
    monthOptions: monthOptions.length ? monthOptions : MONTH_NAMES,
    yearOptions: yearOptions.length
      ? yearOptions
      : [resolvedYear, currentYearName()].filter((value, index, all) => all.indexOf(value) === index),
    unscopedCount,
    properties,
    totals: computeArrearsTotals(properties),
  }
}
