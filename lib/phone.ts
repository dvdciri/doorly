/**
 * UK Phone Number Validation and Normalization
 * 
 * Validates and normalizes UK phone numbers to +44 international format.
 * Supports mobile (07XXX) and landline numbers with various input formats.
 */

/**
 * Normalizes a UK phone number to +44 international format
 * @param phone - The phone number in any format
 * @returns Normalized phone number in +44 format, or null if invalid
 */
export function normalizeUKPhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null
  }

  // Remove all whitespace and common separators, but keep + and digits
  let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '')
  
  // Handle empty strings
  if (!cleaned) {
    return null
  }

  // Handle +44 format (already international)
  if (cleaned.startsWith('+44')) {
    cleaned = cleaned.substring(3)
  }
  // Handle 0044 format
  else if (cleaned.startsWith('0044')) {
    cleaned = cleaned.substring(4)
  }
  // Handle 0 prefix (UK national format)
  else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  // Handle direct number (assume it's missing the leading 0)
  // This handles cases like "7123456789" -> "+44 7123456789"

  // Remove any remaining non-digit characters
  cleaned = cleaned.replace(/\D/g, '')

  // Must have exactly 10 digits (UK numbers are 10 digits after country code)
  if (cleaned.length !== 10) {
    return null
  }

  // Validate UK number patterns
  if (!isValidUKNumber(cleaned)) {
    return null
  }

  // Return in +44 format
  return `+44${cleaned}`
}

/**
 * Validates if a string is a valid UK phone number
 * @param phone - The phone number to validate
 * @returns true if valid UK number, false otherwise
 */
export function validateUKPhone(phone: string): boolean {
  return normalizeUKPhone(phone) !== null
}

/**
 * Formats a UK phone number for display
 * @param phone - The phone number (can be in any format)
 * @returns Formatted phone number for display, or original if invalid
 */
export function formatUKPhone(phone: string): string {
  const normalized = normalizeUKPhone(phone)
  if (!normalized) {
    return phone // Return original if invalid
  }

  // Remove +44 prefix for display formatting
  const digits = normalized.substring(3)
  
  // Format mobile numbers (07XXX XXXXXX)
  if (digits.startsWith('7')) {
    return `+44 ${digits.substring(0, 5)} ${digits.substring(5)}`
  }
  
  // Format landline numbers based on area code length
  // 01X XXX XXXX (3-digit area code)
  if (digits.startsWith('01')) {
    if (digits[2] === '1' || digits[2] === '2') {
      // 011X or 012X - 4 digit area code
      return `+44 ${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`
    } else {
      // 01X - 3 digit area code
      return `+44 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`
    }
  }
  
  // Format 02X numbers (London, etc.) - 02X XXXX XXXX
  if (digits.startsWith('02')) {
    return `+44 ${digits.substring(0, 3)} ${digits.substring(3, 7)} ${digits.substring(7)}`
  }
  
  // Default formatting
  return `+44 ${digits.substring(0, 4)} ${digits.substring(4)}`
}

/**
 * Validates UK number patterns
 * @param digits - 10-digit number (without country code)
 * @returns true if matches valid UK number pattern
 */
function isValidUKNumber(digits: string): boolean {
  if (digits.length !== 10) {
    return false
  }

  // Mobile numbers: 7XXXXXXXXX (10 digits starting with 7)
  if (digits.startsWith('7')) {
    // UK mobile numbers start with 70, 71, 72, 73, 74, 75, 76, 77, 78, 79
    const secondDigit = digits[1]
    if (secondDigit >= '0' && secondDigit <= '9') {
      return true
    }
    return false
  }

  // Landline numbers
  // 01X XXX XXXX (geographic numbers)
  if (digits.startsWith('01')) {
    // Valid area codes: 0113-0119, 0120-0198, 020, 023, 024, 028, 029
    // Simplified: any 01X is valid
    return true
  }

  // 02X XXXX XXXX (geographic numbers - London, etc.)
  if (digits.startsWith('02')) {
    // Valid: 020 (London), 023 (Southampton), 024 (Coventry), 028 (Northern Ireland), 029 (Cardiff)
    // Simplified: any 02X is valid
    return true
  }

  // 03XX XXX XXXX (non-geographic numbers)
  if (digits.startsWith('03')) {
    // Valid: 0300, 0330, 0333, 0344, 0345, 0370, 0371, 0372, 0373, 0374, 0375, 0376, 0377, 0378, 0379, 0380, 0381, 0382, 0383, 0384, 0385, 0386, 0387, 0388, 0389, 0390, 0391, 0392, 0393, 0394, 0395, 0396, 0397, 0398, 0399
    return true
  }

  // 05X XXX XXXX (corporate numbers)
  if (digits.startsWith('05')) {
    // Valid: 0500, 055, 056
    return true
  }

  // 0800 XXX XXXX, 0808 XXX XXXX (free numbers)
  if (digits.startsWith('080')) {
    return true
  }

  // 0845 XXX XXXX, 0870 XXX XXXX (non-geographic)
  if (digits.startsWith('084') || digits.startsWith('087')) {
    return true
  }

  // 09XX XXX XXXX (premium rate)
  if (digits.startsWith('09')) {
    return true
  }

  return false
}
