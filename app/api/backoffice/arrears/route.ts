import { NextRequest, NextResponse } from 'next/server'
import { queryRentArrears } from '@/lib/notion-rent-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || undefined
    const year = searchParams.get('year') || undefined

    const data = await queryRentArrears(month, year)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching rent arrears:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rent arrears' },
      { status: 500 }
    )
  }
}
