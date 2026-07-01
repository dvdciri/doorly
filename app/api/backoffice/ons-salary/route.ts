import { NextResponse } from 'next/server'

const ONS_API_BASE = 'https://api.beta.ons.gov.uk/v1'
const DATASET_ID = 'ashe-tables-7-and-8'

interface QueryOptions {
  area?: string // Local authority name or code
  year?: string // Year filter (e.g., "2023")
  sex?: string // "all", "male", "female"
  employmentStatus?: string // "all", "full-time", "part-time"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const options: QueryOptions = {
      area: body.area,
      year: body.year,
      sex: body.sex || 'all',
      employmentStatus: body.employmentStatus || 'all',
    }

    if (!options.area) {
      return NextResponse.json(
        { error: 'Area is required' },
        { status: 400 }
      )
    }

    // Step 1: Get dataset information to find latest version
    const datasetResponse = await fetch(`${ONS_API_BASE}/datasets/${DATASET_ID}`)
    if (!datasetResponse.ok) {
      throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`)
    }
    const dataset = await datasetResponse.json()

    // Step 2: Get the latest version URL
    const latestVersionUrl = dataset.links?.latest_version?.href
    if (!latestVersionUrl) {
      throw new Error('Could not find latest version URL')
    }

    // Step 3: Get version details to understand dimensions
    const versionResponse = await fetch(latestVersionUrl)
    if (!versionResponse.ok) {
      throw new Error(`Failed to fetch version: ${versionResponse.status}`)
    }
    const version = await versionResponse.json()

    // Step 4: Build observation query URL
    // The ONS API requires ALL dimensions to be specified, but only ONE wildcard is allowed
    // Required dimensions: time, geography, averagesandpercentiles, sex, workingpattern, hoursandearnings, workplaceorresidence
    const observationsUrl = `${latestVersionUrl}/observations`
    const queryParams = new URLSearchParams()

    // Get dimension options from version metadata
    const dimensions = version.dimensions || {}

    // Try to get dimension metadata from the version links if available
    let dimensionMetadata: any = {}
    try {
      if (version.links?.dimensions?.href) {
        const dimMetadataResponse = await fetch(version.links.dimensions.href)
        if (dimMetadataResponse.ok) {
          dimensionMetadata = await dimMetadataResponse.json()
        }
      }
    } catch (err) {
      console.log('Could not fetch dimension metadata, using version dimensions')
    }

    // Helper function to extract options from dimension
    const getDimensionOptions = (dimName: string): any[] => {
      // First try dimension metadata
      if (dimensionMetadata[dimName]?.options && Array.isArray(dimensionMetadata[dimName].options)) {
        return dimensionMetadata[dimName].options
      }
      
      const dim = dimensions[dimName] || dimensionMetadata[dimName]
      if (!dim) {
        return []
      }
      
      // Try different possible structures
      if (dim.options && Array.isArray(dim.options)) {
        return dim.options
      }
      if (dim.option && Array.isArray(dim.option)) {
        return dim.option
      }
      if (Array.isArray(dim)) {
        return dim
      }
      // Sometimes it's a single option object
      if (dim.option && typeof dim.option === 'object') {
        return [dim.option]
      }
      // Try accessing through links
      if (dim.links?.options?.href) {
        // We'd need to fetch this, but for now return empty
        return []
      }
      return []
    }

    // Helper function to find option by label or value
    const findOption = (dimName: string, searchValue: string): string | null => {
      const options = getDimensionOptions(dimName)
      const searchLower = searchValue.toLowerCase()
      
      for (const opt of options) {
        const optionValue = opt.option || opt.id || opt.value || opt
        const optionLabel = (opt.label || opt.name || '').toLowerCase()
        const optionValueStr = String(optionValue).toLowerCase()
        
        if (optionLabel.includes(searchLower) || 
            optionValueStr.includes(searchLower) ||
            searchLower.includes(optionLabel) ||
            searchLower.includes(optionValueStr)) {
          return String(optionValue)
        }
      }
      return null
    }

    // Helper function to get first option
    const getFirstOption = (dimName: string): string | null => {
      const options = getDimensionOptions(dimName)
      if (options.length > 0) {
        const first = options[0]
        return String(first.option || first.id || first.value || first)
      }
      return null
    }

    // Time dimension - use provided year or wildcard (only one wildcard allowed)
    if (options.year) {
      queryParams.append('time', options.year)
    } else {
      // Use wildcard for time (this will be our only wildcard)
      queryParams.append('time', '*')
    }

    // Geography dimension - required, use provided area
    queryParams.append('geography', options.area)

    // Averages and percentiles - try to find "mean" or use first available
    const avgPercentileOptions = getDimensionOptions('averagesandpercentiles')
    
    // Log for debugging
    console.log('Dimension structure:', {
      averagesandpercentiles: dimensions.averagesandpercentiles,
      optionsFound: avgPercentileOptions.length,
      firstFew: avgPercentileOptions.slice(0, 3),
    })
    
    const avgPercentile = findOption('averagesandpercentiles', 'mean') || 
                         findOption('averagesandpercentiles', 'average') ||
                         getFirstOption('averagesandpercentiles')
    
    if (!avgPercentile) {
      // If we can't find it, try common ONS values as fallback
      const fallbackValues = ['mean', 'median', 'all', 'total']
      for (const fallback of fallbackValues) {
        // Try the fallback value directly
        queryParams.append('averagesandpercentiles', fallback)
        // Test if this works by making a test query (or just use it)
        break
      }
      // For now, use 'mean' as a hardcoded fallback since it's the most common
      queryParams.set('averagesandpercentiles', 'mean')
    } else {
      queryParams.append('averagesandpercentiles', avgPercentile)
    }

    // Sex dimension - use provided value or select a default
    if (options.sex && options.sex !== 'all') {
      const sexValue = findOption('sex', options.sex) || options.sex
      queryParams.append('sex', sexValue)
    } else {
      // Try to find "all" or "total", otherwise use first option
      const sexDefault = findOption('sex', 'all') || 
                        findOption('sex', 'total') ||
                        getFirstOption('sex') ||
                        'all' // Fallback
      queryParams.append('sex', sexDefault)
    }

    // Working pattern dimension - use provided value or select a default
    if (options.employmentStatus && options.employmentStatus !== 'all') {
      const workingPatternValue = options.employmentStatus === 'full-time' ? 'full-time' : 'part-time'
      const patternValue = findOption('workingpattern', workingPatternValue) || workingPatternValue
      queryParams.append('workingpattern', patternValue)
    } else {
      // Try to find "all" or "total", otherwise use first option
      const patternDefault = findOption('workingpattern', 'all') ||
                            findOption('workingpattern', 'total') ||
                            getFirstOption('workingpattern') ||
                            'all' // Fallback
      queryParams.append('workingpattern', patternDefault)
    }

    // Hours and earnings dimension - try to find annual or use first available
    const hoursEarnings = findOption('hoursandearnings', 'annual') ||
                         findOption('hoursandearnings', 'gross annual') ||
                         findOption('hoursandearnings', 'gross-annual') ||
                         getFirstOption('hoursandearnings') ||
                         'gross-annual' // Fallback
    queryParams.append('hoursandearnings', hoursEarnings)

    // Workplace or residence dimension - try to find workplace or use first available
    const workplaceResidence = findOption('workplaceorresidence', 'workplace') ||
                              findOption('workplaceorresidence', 'work') ||
                              getFirstOption('workplaceorresidence') ||
                              'workplace' // Fallback
    queryParams.append('workplaceorresidence', workplaceResidence)

    // Step 5: Query observations
    const observationsResponse = await fetch(`${observationsUrl}?${queryParams.toString()}`)
    
    if (!observationsResponse.ok) {
      const errorText = await observationsResponse.text()
      console.error('ONS API error:', {
        status: observationsResponse.status,
        statusText: observationsResponse.statusText,
        body: errorText,
      })
      return NextResponse.json(
        { 
          error: 'Failed to fetch data from ONS API',
          details: `Status: ${observationsResponse.status} ${observationsResponse.statusText}`,
        },
        { status: observationsResponse.status }
      )
    }

    const observationsData = await observationsResponse.json()

    // Step 6: Transform the response to a user-friendly format
    // Handle case where observations is null (no results found) - this is valid
    if (observationsData.observations === null) {
      return NextResponse.json({ 
        results: [],
        metadata: {
          datasetTitle: dataset.title,
          datasetDescription: dataset.description,
          unitOfMeasure: dataset.unit_of_measure,
        },
        message: 'No data found for the specified criteria. Try adjusting your filters or area name.',
      })
    }

    if (!Array.isArray(observationsData.observations)) {
      console.error('Unexpected response structure:', observationsData)
      return NextResponse.json(
        { error: 'Unexpected response format from ONS API' },
        { status: 500 }
      )
    }

    // Transform observations
    const results = observationsData.observations.map((obs: any) => {
      const result: any = {
        value: obs.observation,
      }
      
      // Extract dimension values
      if (obs.dimensions) {
        Object.keys(obs.dimensions).forEach((dimKey) => {
          const dimValue = obs.dimensions[dimKey]
          result[dimKey] = dimValue?.option || dimValue?.value || dimValue
        })
      }

      return result
    })

    return NextResponse.json({ 
      results,
      metadata: {
        datasetTitle: dataset.title,
        datasetDescription: dataset.description,
        unitOfMeasure: dataset.unit_of_measure,
      },
    })
  } catch (error) {
    console.error('Error fetching ONS salary data:', error)
    return NextResponse.json(
      { 
        error: 'An error occurred while fetching ONS salary data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
