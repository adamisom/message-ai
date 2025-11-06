/**
 * Phone Number Formatting Utilities
 * 
 * Single source of truth for phone number formatting logic.
 * Used across the app for consistent phone number display and input.
 */

/**
 * Format phone number with auto-formatting: (XXX)XXX-XXXX
 * Handles progressive formatting as user types and unformatting on backspace.
 * 
 * @param input Raw or partially formatted phone number
 * @returns Formatted phone number
 * 
 * @example
 * formatPhoneNumber('5551234567') // '(555)123-4567'
 * formatPhoneNumber('555') // '555'
 * formatPhoneNumber('5551') // '(555)1'
 */
export function formatPhoneNumber(input: string): string {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10);
  
  // Apply formatting based on length
  if (limitedDigits.length <= 3) {
    return limitedDigits;
  } else if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)})${limitedDigits.slice(3)}`;
  } else {
    return `(${limitedDigits.slice(0, 3)})${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  }
}

/**
 * Extract raw digits from formatted phone number.
 * Strips all non-digit characters.
 * 
 * @param formattedPhone Formatted phone number (e.g., "(555)123-4567")
 * @returns Raw digits only (e.g., "5551234567")
 * 
 * @example
 * extractDigits('(555)123-4567') // '5551234567'
 * extractDigits('555-123-4567') // '5551234567'
 * extractDigits('5551234567') // '5551234567'
 */
export function extractDigits(formattedPhone: string): string {
  return formattedPhone.replace(/\D/g, '');
}

/**
 * Format phone number for display (simple version).
 * Input: "1234567890" -> Output: "(123) 456-7890"
 * 
 * Unlike formatPhoneNumber(), this version adds a space after the area code
 * and is intended for displaying stored phone numbers, not live input.
 * 
 * @param phoneNumber 10-digit phone number
 * @returns Formatted phone number with spaces, or original input if invalid
 * 
 * @example
 * formatPhoneNumberDisplay('5551234567') // '(555) 123-4567'
 */
export function formatPhoneNumberDisplay(phoneNumber: string): string {
  if (!phoneNumber || phoneNumber.length !== 10) {
    return phoneNumber;
  }
  
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
}

