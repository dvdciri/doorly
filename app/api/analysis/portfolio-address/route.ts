import { NextResponse } from 'next/server'

const GOOGLE_PLACES_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json'
const GOOGLE_PLACES_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json'
const EPC_SEARCH_URL = 'https://epc.opendatacommunities.org/api/v1/domestic/search'

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
  epcRatings?: Array<{ address: string; rating: string }> // For multiple flats (legacy)
  epcMatchedAddress?: string // The address from EPC that was matched (legacy)
  epcRecords?: EPCRecord[] // All matching EPC records with full details
  propertyType?: string // Legacy - kept for backward compatibility
  totalFloorArea?: string // Legacy - kept for backward compatibility
  error?: string
}

async function getPlaceAutocomplete(input: string, apiKey: string): Promise<{ place_id?: string; error?: string }> {
  try {
    const params = new URLSearchParams({
      input: input.trim(),
      types: 'address',
      components: 'country:gb',
      key: apiKey,
    })

    const response = await fetch(`${GOOGLE_PLACES_AUTOCOMPLETE_URL}?${params.toString()}`)

    if (!response.ok) {
      return {
        error: `Autocomplete API error: ${response.status} ${response.statusText}`,
      }
    }

    const data = await response.json()

    if (data.status === 'REQUEST_DENIED') {
      return {
        error: `API request denied: ${data.error_message || 'Invalid API key or request'}`,
      }
    }

    if (data.status === 'ZERO_RESULTS') {
      return {
        error: 'No results found for this address',
      }
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return {
        error: `Autocomplete API status: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`,
      }
    }

    if (!data.predictions || data.predictions.length === 0) {
      return {
        error: 'No predictions returned',
      }
    }

    // Take the first prediction's place_id
    const placeId = data.predictions[0].place_id
    return { placeId }
  } catch (error) {
    return {
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

async function getPlaceDetails(placeId: string, apiKey: string): Promise<{ formattedAddress?: string; addressComponents?: any[]; geometry?: any; error?: string }> {
  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'formatted_address,address_components,geometry',
      key: apiKey,
    })

    const response = await fetch(`${GOOGLE_PLACES_DETAILS_URL}?${params.toString()}`)

    if (!response.ok) {
      return {
        error: `Place Details API error: ${response.status} ${response.statusText}`,
      }
    }

    const data = await response.json()

    if (data.status === 'REQUEST_DENIED') {
      return {
        error: `API request denied: ${data.error_message || 'Invalid API key or request'}`,
      }
    }

    if (data.status !== 'OK') {
      return {
        error: `Place Details API status: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`,
      }
    }

    if (!data.result) {
      return {
        error: 'No result data returned',
      }
    }

    return {
      formattedAddress: data.result.formatted_address,
      addressComponents: data.result.address_components,
      geometry: data.result.geometry,
    }
  } catch (error) {
    return {
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

function extractPostcode(formattedAddress: string, addressComponents?: any[]): string | null {
  // First try to extract from addressComponents (more reliable)
  if (addressComponents && Array.isArray(addressComponents)) {
    const postalCodeComponent = addressComponents.find(
      (component) => component.types && component.types.includes('postal_code')
    )
    if (postalCodeComponent && postalCodeComponent.long_name) {
      return postalCodeComponent.long_name.toUpperCase().replace(/\s+/g, '')
    }
  }

  // Fallback: extract from formatted address using UK postcode regex
  // UK postcode format: AA9A 9AA or A9A 9AA or A9 9AA or AA9 9AA or A99 9AA or AA99 9AA
  const ukPostcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i
  const match = formattedAddress.match(ukPostcodeRegex)
  if (match && match[1]) {
    return match[1].toUpperCase().replace(/\s+/g, '')
  }

  return null
}

/**
 * Extracts the house number from an EPC address, skipping flat numbers.
 * Handles patterns like:
 * - "Flat 3, 7, Bournemouth Road" → "7"
 * - "Flat 2, 21 Wood Park Road" → "21"
 * - "32 Caunce Street" → "32"
 * - "Flat A, 32 Caunce Street" → "32"
 * - "Apartment 5, 10 Main Street" → "10"
 */
function extractHouseNumberFromEPCAddress(address: string): string | null {
  if (!address) return null
  
  const lowerAddress = address.toLowerCase().trim()
  
  // Pattern 1: "Flat X, Y, Street" or "Flat X, Y Street" where Y is the house number
  // Match: "flat" followed by optional number/letter, comma, then number
  const flatPattern1 = /^(?:flat|apartment|apt|unit)\s+[a-z0-9]+,?\s*(\d+[a-z]?)\s*[,]?\s*/i
  const match1 = lowerAddress.match(flatPattern1)
  if (match1 && match1[1]) {
    return match1[1].replace(/[a-z]/g, '')
  }
  
  // Pattern 2: "Flat X, Y, Street" - check for comma-separated numbers after flat designation
  // This handles cases like "Flat 3, 7, Bournemouth Road"
  const flatPattern2 = /^(?:flat|apartment|apt|unit)\s+[a-z0-9]+,?\s*(\d+[a-z]?)\s*,/i
  const match2 = lowerAddress.match(flatPattern2)
  if (match2 && match2[1]) {
    return match2[1].replace(/[a-z]/g, '')
  }
  
  // Pattern 3: No flat designation - extract first number (house number)
  const houseNumberMatch = lowerAddress.match(/^(\d+[a-z]?)\s*[,]?\s*/i)
  if (houseNumberMatch && houseNumberMatch[1]) {
    return houseNumberMatch[1].replace(/[a-z]/g, '')
  }
  
  return null
}

async function getEPCRating(formattedAddress: string, addressComponents: any[], email: string, apiKey: string): Promise<{ rating?: string; epcRatings?: Array<{ address: string; rating: string }>; epcMatchedAddress?: string; epcRecords?: EPCRecord[]; propertyType?: string; totalFloorArea?: string; error?: string }> {
  try {
    // Extract postcode from address
    const postcode = extractPostcode(formattedAddress, addressComponents)
    
    if (!postcode) {
      return {}
    }
    
    // Create Basic Auth token
    const authToken = Buffer.from(`${email}:${apiKey}`).toString('base64')

    // Fetch all pages of results using search-after pagination
    // According to EPC API docs: default page size is 25, max is 5000
    // Use search-after header to paginate through all results
    let allResults: any[] = []
    let searchAfter: string | null = null
    let pageCount = 0
    const maxPages = 20 // Safety limit to prevent infinite loops
    const pageSize = 5000 // Maximum page size

    do {
      pageCount++
      const currentParams = new URLSearchParams({
        postcode: postcode,
        size: '5000',
      })
      
      if (searchAfter) {
        currentParams.set('search-after', searchAfter)
      }
      
      const currentUrl = `${EPC_SEARCH_URL}?${currentParams.toString()}`

      const response = await fetch(currentUrl, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${authToken}`,
        },
      })

      if (!response.ok) {
        // Don't treat 401/403 as critical errors - just return no rating
        if (response.status === 401 || response.status === 403) {
          return {}
        }
        // For other errors, break pagination
        break
      }

      // Read response text once (can only be read once)
      const responseText = await response.text()

      if (!responseText || responseText.trim().length === 0) {
        break
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        break
      }

      // Process this page's results
      let pageResults: any[] = []
      
      if (data['column-names'] && Array.isArray(data['column-names'])) {
        const columnNames = data['column-names']
        
        // Check for rows array
        if (data.rows && Array.isArray(data.rows)) {
          // Rows can be either arrays (need conversion) or objects (already converted)
          if (data.rows.length > 0 && typeof data.rows[0] === 'object' && !Array.isArray(data.rows[0])) {
            // Rows are already objects - use them directly
            pageResults = data.rows.filter((row: any) => row && typeof row === 'object')
          } else {
            // Rows are arrays - convert to objects using column names
            pageResults = data.rows
              .filter((row: any) => Array.isArray(row) && row.length > 0)
              .map((row: any[]) => {
                const obj: any = {}
                columnNames.forEach((col: string, index: number) => {
                  obj[col] = row[index] !== undefined ? row[index] : null
                })
                return obj
              })
          }
        }
      } else if (data.results && Array.isArray(data.results)) {
        pageResults = data.results
      } else if (Array.isArray(data)) {
        pageResults = data
      }

      allResults = allResults.concat(pageResults)

      // Check for next page using X-Next-Search-After header
      searchAfter = response.headers.get('X-Next-Search-After')
    } while (searchAfter && pageCount < maxPages)

    const results = allResults

    // Check if we have results
    if (results && Array.isArray(results) && results.length > 0) {
      // Extract house number from the formatted address
      // Look for the first number at the start (house number)
      const houseNumberMatch = formattedAddress.match(/^(\d+[a-z]?)\s*[,]?\s*/i)
      const searchHouseNumber = houseNumberMatch ? houseNumberMatch[1].toLowerCase() : null
      const searchHouseNumberNumeric = searchHouseNumber ? searchHouseNumber.replace(/[a-z]/g, '') : null
      
      // Extract street name (everything after the house number, before city/postcode)
      // Pattern: "32 Caunce St, Blackpool FY1 3DT, UK" -> extract "Caunce St"
      const streetMatch = formattedAddress.match(/^\d+[a-z]?\s*,?\s*([^,]+?)(?:\s*,\s*[A-Z][^,]*)?/i)
      const searchStreet = streetMatch && streetMatch[1] ? streetMatch[1].trim().toLowerCase() : null
      
      // Find matching properties - MUST match house number exactly
      const matchingProperties: any[] = []
      
      for (const result of results) {
        // Check address1, address2, address3, and address fields
        const resultAddress1 = (result.address1 || '').toLowerCase()
        const resultAddress2 = (result.address2 || '').toLowerCase()
        const resultAddress3 = (result.address3 || '').toLowerCase()
        const resultAddress = (result.address || '').toLowerCase()
        
        // Combine all address fields for searching
        const combinedAddress = `${resultAddress1} ${resultAddress2} ${resultAddress3} ${resultAddress}`.trim()
        
        // Check if house number matches EXACTLY (must be present)
        let houseNumberMatches = false
        if (searchHouseNumberNumeric) {
          // Extract house number from EPC address using helper function
          // This correctly handles flat numbers vs house numbers
          const epcHouseNumber = extractHouseNumberFromEPCAddress(resultAddress)
          if (epcHouseNumber && epcHouseNumber === searchHouseNumberNumeric) {
            houseNumberMatches = true
          }
        }
        
        // Only include if house number matches (strict requirement)
        if (houseNumberMatches) {
          matchingProperties.push(result)
        }
      }
      
      if (matchingProperties.length === 0) {
        return {}
      }
      
      // If we have multiple matches, check if they're flats at the same building
      const isMultipleFlats = matchingProperties.length > 1
      let buildingKey = ''
      
      if (isMultipleFlats) {
        // Check if they're all at the same building (same address2/address3)
        const buildingGroups = new Map<string, any[]>()
        
        for (const prop of matchingProperties) {
          // Use address field to group flats (extract building address without flat designation)
          const address = (prop.address || '').toLowerCase()
          // Remove flat designation to get building address
          const buildingAddress = address.replace(/^(flat\s+[a-z0-9]+,?\s*)/i, '').trim()
          const key = buildingAddress || address
          if (!buildingGroups.has(key)) {
            buildingGroups.set(key, [])
          }
          buildingGroups.get(key)!.push(prop)
        }
        
        // If all matches are at the same building, they're likely flats
        if (buildingGroups.size === 1) {
          buildingKey = Array.from(buildingGroups.keys())[0]
        }
      }
      
      // Extract all EPC records with full details from matching properties
      const validRatings = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
      const epcRecords: EPCRecord[] = []
      
      // Helper function to check if EPC is expired (EPC lasts 10 years)
      const isEPCExpired = (lodgementDate: string | null | undefined): boolean => {
        if (!lodgementDate) return false
        
        try {
          const lodgement = new Date(lodgementDate)
          const now = new Date()
          const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate())
          return lodgement < tenYearsAgo
        } catch {
          return false
        }
      }
      
      for (const prop of matchingProperties) {
        const rating = prop['current-energy-rating']
        if (rating && typeof rating === 'string') {
          const upperRating = rating.toUpperCase()
          if (validRatings.includes(upperRating)) {
            // Build address string from available fields
            const propAddress = [
              prop.address1,
              prop.address2,
              prop.address3
            ].filter(Boolean).join(', ') || prop.address || 'Unknown'
            
            const lodgementDate = prop['lodgement-date'] || undefined
            const isExpired = isEPCExpired(lodgementDate)
            
            epcRecords.push({
              address: propAddress,
              rating: upperRating,
              propertyType: prop['property-type'] || undefined,
              totalFloorArea: prop['total-floor-area'] || undefined,
              lodgementDate: lodgementDate,
              isExpired: isExpired,
            })
          }
        }
      }
      
      if (epcRecords.length === 0) {
        return {}
      }
      
      // Return all EPC records in epcRecords array
      // Also include legacy fields for backward compatibility
      const returnData: any = {
        epcRecords: epcRecords,
        // Legacy fields for backward compatibility
        rating: epcRecords.length === 1 ? epcRecords[0].rating : undefined,
        epcMatchedAddress: epcRecords.length === 1 ? epcRecords[0].address : undefined,
        propertyType: epcRecords[0]?.propertyType,
        totalFloorArea: epcRecords[0]?.totalFloorArea,
      }
      
      // If multiple records, also include legacy epcRatings format
      if (epcRecords.length > 1) {
        returnData.epcRatings = epcRecords.map(record => ({
          address: record.address,
          rating: record.rating
        }))
        // Use building address or first record address for legacy epcMatchedAddress
        returnData.epcMatchedAddress = buildingKey || epcRecords[0].address
      }
      
      return returnData
    }

    // No results found is not an error
    return {}
  } catch (error) {
    // Network errors are not critical - just return empty result
    return {}
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key is not configured. Please set GOOGLE_MAPS_API_KEY in environment variables.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { addresses } = body

    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected an array of addresses.' },
        { status: 400 }
      )
    }

    if (addresses.length === 0) {
      return NextResponse.json(
        { error: 'No addresses provided.' },
        { status: 400 }
      )
    }

    // Filter out empty addresses
    const validAddresses = addresses.filter((addr: string) => addr && addr.trim().length > 0)

    if (validAddresses.length === 0) {
      return NextResponse.json(
        { error: 'No valid addresses provided.' },
        { status: 400 }
      )
    }

    // Process each address
    const results: AddressResult[] = await Promise.all(
      validAddresses.map(async (address: string): Promise<AddressResult> => {
        const result: AddressResult = {
          originalInput: address.trim(),
        }

        // Step 1: Get place_id from Autocomplete
        const autocompleteResult = await getPlaceAutocomplete(address, apiKey)

        if (autocompleteResult.error || !autocompleteResult.placeId) {
          result.error = autocompleteResult.error || 'Failed to get place_id'
          return result
        }

        result.placeId = autocompleteResult.placeId

        // Step 2: Get full address details
        const detailsResult = await getPlaceDetails(autocompleteResult.placeId, apiKey)

        if (detailsResult.error) {
          result.error = detailsResult.error
          return result
        }

        result.formattedAddress = detailsResult.formattedAddress
        result.addressComponents = detailsResult.addressComponents
        result.geometry = detailsResult.geometry

        // Step 3: Get EPC rating (optional - don't fail if this fails)
        if (result.formattedAddress) {
          const epcEmail = process.env.EPC_EMAIL_ADDRESS
          const epcApiKey = process.env.EPC_API_KEY

          if (epcEmail && epcApiKey) {
            const epcResult = await getEPCRating(
              result.formattedAddress,
              result.addressComponents || [],
              epcEmail,
              epcApiKey
            )
            if (epcResult.rating) {
              result.epcRating = epcResult.rating
            }
            if (epcResult.epcRatings) {
              result.epcRatings = epcResult.epcRatings
            }
            if (epcResult.epcMatchedAddress) {
              result.epcMatchedAddress = epcResult.epcMatchedAddress
            }
            if (epcResult.epcRecords) {
              result.epcRecords = epcResult.epcRecords
            }
            if (epcResult.propertyType) {
              result.propertyType = epcResult.propertyType
            }
            if (epcResult.totalFloorArea) {
              result.totalFloorArea = epcResult.totalFloorArea
            }
            // Note: We don't set error if EPC lookup fails - it's optional
          }
        }

        return result
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error processing addresses:', error)
    return NextResponse.json(
      {
        error: 'An error occurred while processing addresses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
