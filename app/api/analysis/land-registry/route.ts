import { NextResponse } from 'next/server'

const SPARQL_ENDPOINT = 'https://landregistry.data.gov.uk/landregistry/sparql'

const DEFAULT_REGIONS = [
  'Newport',
  'Newcastle upon Tyne',
  'Lancaster',
  'Manchester',
  'Liverpool',
  'Stoke-on-Trent',
]

interface QueryOptions {
  periodFrom?: string // Format: YYYY-MM
  periodTo?: string // Format: YYYY-MM
  propertyTypes?: string[] // ['all', 'detached', 'semi', 'terraced', 'flat']
  regions?: string[] // Region names to query, e.g. ['Manchester', 'Liverpool']
}

function buildSparqlQuery(options: QueryOptions): string {
  const {
    periodFrom = '2006-01',
    periodTo = '2026-01',
    propertyTypes = ['all'],
    regions = DEFAULT_REGIONS,
  } = options

  const regionValues =
    regions.length > 0 ? regions : DEFAULT_REGIONS

  // Build SELECT clause based on selected property types
  const selectFields = [
    '?regionName',
    '?region',
    '?gssCode',
    '?period',
    '?salesVolume',
    '?reportingPeriod',
    '?pivotableDate',
  ]

  if (propertyTypes.includes('all')) {
    selectFields.push(
      '?hpiAll',
      '?avgAll',
      '?pctMonthlyAll',
      '?pctYearlyAll'
    )
  }
  if (propertyTypes.includes('detached')) {
    selectFields.push(
      '?hpiDetached',
      '?avgDetached',
      '?pctMonthlyDetached',
      '?pctYearlyDetached'
    )
  }
  if (propertyTypes.includes('semi')) {
    selectFields.push(
      '?hpiSemi',
      '?avgSemi',
      '?pctMonthlySemi',
      '?pctYearlySemi'
    )
  }
  if (propertyTypes.includes('terraced')) {
    selectFields.push(
      '?hpiTerraced',
      '?avgTerraced',
      '?pctMonthlyTerraced',
      '?pctYearlyTerraced'
    )
  }
  if (propertyTypes.includes('flat')) {
    selectFields.push(
      '?hpiFlat',
      '?avgFlat',
      '?pctMonthlyFlat',
      '?pctYearlyFlat'
    )
  }

  // Build WHERE clause with conditional OPTIONAL blocks
  let optionalBlocks = `
  # --- Reporting period ---
  OPTIONAL { ?obs ukhpi:refPeriodDuration ?reportingPeriod }

  # --- Sales volume ---
  OPTIONAL { ?obs ukhpi:salesVolume ?salesVolume }
`

  if (propertyTypes.includes('all')) {
    optionalBlocks += `
  # --- All property types ---
  OPTIONAL { ?obs ukhpi:housePriceIndex ?hpiAll }
  OPTIONAL { ?obs ukhpi:averagePrice   ?avgAll }
  OPTIONAL { ?obs ukhpi:percentageChange        ?pctMonthlyAll }
  OPTIONAL { ?obs ukhpi:percentageAnnualChange  ?pctYearlyAll }
`
  }

  if (propertyTypes.includes('detached')) {
    optionalBlocks += `
  # --- Detached ---
  OPTIONAL { ?obs ukhpi:housePriceIndexDetached      ?hpiDetached }
  OPTIONAL { ?obs ukhpi:averagePriceDetached         ?avgDetached }
  OPTIONAL { ?obs ukhpi:percentageChangeDetached     ?pctMonthlyDetached }
  OPTIONAL { ?obs ukhpi:percentageAnnualChangeDetached ?pctYearlyDetached }
`
  }

  if (propertyTypes.includes('semi')) {
    optionalBlocks += `
  # --- Semi-detached ---
  OPTIONAL { ?obs ukhpi:housePriceIndexSemiDetached      ?hpiSemi }
  OPTIONAL { ?obs ukhpi:averagePriceSemiDetached         ?avgSemi }
  OPTIONAL { ?obs ukhpi:percentageChangeSemiDetached     ?pctMonthlySemi }
  OPTIONAL { ?obs ukhpi:percentageAnnualChangeSemiDetached ?pctYearlySemi }
`
  }

  if (propertyTypes.includes('terraced')) {
    optionalBlocks += `
  # --- Terraced ---
  OPTIONAL { ?obs ukhpi:housePriceIndexTerraced      ?hpiTerraced }
  OPTIONAL { ?obs ukhpi:averagePriceTerraced         ?avgTerraced }
  OPTIONAL { ?obs ukhpi:percentageChangeTerraced     ?pctMonthlyTerraced }
  OPTIONAL { ?obs ukhpi:percentageAnnualChangeTerraced ?pctYearlyTerraced }
`
  }

  if (propertyTypes.includes('flat')) {
    optionalBlocks += `
  # --- Flats and maisonettes ---
  OPTIONAL { ?obs ukhpi:housePriceIndexFlatMaisonette      ?hpiFlat }
  OPTIONAL { ?obs ukhpi:averagePriceFlatMaisonette         ?avgFlat }
  OPTIONAL { ?obs ukhpi:percentageChangeFlatMaisonette     ?pctMonthlyFlat }
  OPTIONAL { ?obs ukhpi:percentageAnnualChangeFlatMaisonette ?pctYearlyFlat }
`
  }

  const query = `
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
prefix ukhpi: <http://landregistry.data.gov.uk/def/ukhpi/>
prefix lrcommon: <http://landregistry.data.gov.uk/def/common/>

SELECT DISTINCT
  ${selectFields.join('\n  ')}
WHERE {
  VALUES ?wanted {
    ${regionValues.map((r) => `"${r.replace(/"/g, '\\"')}"`).join('\n    ')}
  }

  ?region rdfs:label ?regionName .
  FILTER(langMatches(lang(?regionName), "EN"))
  FILTER(STR(?regionName) = ?wanted)

  ?obs
    ukhpi:refRegion ?region ;
    ukhpi:refMonth  ?period .

${optionalBlocks}
  # --- Region GSS code (predicates vary; take whichever exists) ---
  OPTIONAL { ?region lrcommon:gssCode ?gss1 }
  OPTIONAL { ?region lrcommon:hasGSSCode ?gss2 }
  BIND(COALESCE(?gss1, ?gss2) AS ?gssCode)

  # --- Pivotable date: convert YYYY-MM to YYYY-MM-01 (date) ---
  BIND(xsd:date(CONCAT(STR(?period), "-01")) AS ?pivotableDate)

  # --- Time window ---
  FILTER(?period >= "${periodFrom}"^^xsd:gYearMonth && ?period <= "${periodTo}"^^xsd:gYearMonth)
}
ORDER BY ?regionName ?period
`

  return query
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const options: QueryOptions = {
      periodFrom: body.periodFrom,
      periodTo: body.periodTo,
      propertyTypes: body.propertyTypes || ['all'],
      regions: Array.isArray(body.regions)
        ? body.regions.filter((r: unknown) => typeof r === 'string' && r.trim())
        : typeof body.regions === 'string'
          ? body.regions
              .split(/[,;]/)
              .map((r: string) => r.trim())
              .filter(Boolean)
          : undefined,
    }

    // Validate date format (YYYY-MM)
    const dateRegex = /^\d{4}-\d{2}$/
    if (options.periodFrom && !dateRegex.test(options.periodFrom)) {
      return NextResponse.json(
        { error: 'Invalid periodFrom format. Expected YYYY-MM' },
        { status: 400 }
      )
    }
    if (options.periodTo && !dateRegex.test(options.periodTo)) {
      return NextResponse.json(
        { error: 'Invalid periodTo format. Expected YYYY-MM' },
        { status: 400 }
      )
    }

    // Build the SPARQL query based on options
    const sparqlQuery = buildSparqlQuery(options)

    // Prepare the query as form data
    const formData = new URLSearchParams()
    formData.append('query', sparqlQuery)

    // Make request to Land Registry SPARQL endpoint
    const response = await fetch(SPARQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Land Registry API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      return NextResponse.json(
        { 
          error: 'Failed to fetch data from Land Registry API',
          details: `Status: ${response.status} ${response.statusText}`,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Check if the response has the expected structure
    if (!data.results || !data.results.bindings) {
      console.error('Unexpected response structure:', data)
      return NextResponse.json(
        { error: 'Unexpected response format from Land Registry API' },
        { status: 500 }
      )
    }

    // Transform SPARQL results to a simpler format
    const bindings = data.results.bindings
    const results = bindings.map((binding: any) => {
      const result: any = {}
      // Extract all variables from the binding
      Object.keys(binding).forEach((key) => {
        const value = binding[key]
        if (value && value.value) {
          result[key] = value.value
        } else {
          result[key] = null
        }
      })
      return result
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error fetching Land Registry data:', error)
    return NextResponse.json(
      { 
        error: 'An error occurred while fetching Land Registry data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
