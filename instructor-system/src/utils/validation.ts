// Israeli ID number validation utilities

/**
 * Validates Israeli ID number using checksum algorithm
 * @param idNumber - The ID number as string
 * @returns boolean indicating if the ID is valid
 */
export function validateIsraeliId(idNumber: string): boolean {
  // Remove any non-digit characters
  const cleanId = idNumber.replace(/\D/g, '');

  // Must be 8 or 9 digits
  if (cleanId.length < 8 || cleanId.length > 9) {
    return false;
  }

  // Pad with leading zero if 8 digits
  const paddedId = cleanId.padStart(9, '0');

  // Calculate checksum
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(paddedId.charAt(i));

    // For even positions (0,2,4,6,8), multiply by 1
    // For odd positions (1,3,5,7), multiply by 2
    if (i % 2 === 1) {
      digit *= 2;
      // If result is two digits, add them together
      if (digit > 9) {
        digit = Math.floor(digit / 10) + (digit % 10);
      }
    }

    sum += digit;
  }

  // ID is valid if sum is divisible by 10
  return sum % 10 === 0;
}

/**
 * Formats Israeli ID number for display
 * @param idNumber - The raw ID number
 * @returns formatted ID number (e.g., "123456789" -> "12345-6789")
 */
export function formatIsraeliId(idNumber: string): string {
  const cleanId = idNumber.replace(/\D/g, '');
  if (cleanId.length === 9) {
    return `${cleanId.slice(0, 5)}-${cleanId.slice(5)}`;
  }
  if (cleanId.length === 8) {
    return `${cleanId.slice(0, 4)}-${cleanId.slice(4)}`;
  }
  return cleanId;
}

/**
 * Cleans and normalizes Israeli ID number
 * @param idNumber - Raw input
 * @returns clean digits-only string
 */
export function cleanIsraeliId(idNumber: string): string {
  return idNumber.replace(/\D/g, '');
}

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns boolean indicating if email is valid
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates Israeli phone number
 * @param phone - Phone number to validate
 * @returns boolean indicating if phone is valid
 */
export function validateIsraeliPhone(phone: string): boolean {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');

  // Check for valid Israeli phone patterns
  // Mobile: 05X-XXXXXXX (10 digits total)
  // Landline: 0X-XXXXXXX (9-10 digits)
  // International: 972X-XXXXXXX (starts with 972)

  if (cleanPhone.startsWith('972')) {
    // International format
    return cleanPhone.length >= 12 && cleanPhone.length <= 13;
  } else if (cleanPhone.startsWith('05')) {
    // Mobile number
    return cleanPhone.length === 10;
  } else if (cleanPhone.startsWith('0')) {
    // Landline
    return cleanPhone.length >= 9 && cleanPhone.length <= 10;
  }

  return false;
}

/**
 * Sanitizes string input to prevent XSS
 * @param input - Raw string input
 * @returns sanitized string
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates instructor name format
 * @param name - Name to validate
 * @returns boolean indicating if name is valid
 */
export function validateInstructorName(name: string): boolean {
  // Name should be at least 2 characters, contain letters and spaces
  const nameRegex = /^[\u0590-\u05FFa-zA-Z\s]{2,50}$/;
  return nameRegex.test(name.trim());
}

/**
 * Debounce function for search inputs
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Formats date for display in Hebrew locale
 * @param date - Date string or Date object
 * @returns formatted date string
 */
export function formatDateHebrew(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats date and time for display
 * @param date - Date string or Date object
 * @returns formatted date and time string
 */
export function formatDateTimeHebrew(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculates session duration in days
 * @param startDate - Start date
 * @param endDate - End date
 * @returns number of days
 */
export function calculateSessionDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a session is currently active
 * @param startDate - Session start date
 * @param endDate - Session end date
 * @returns boolean indicating if session is active
 */
export function isSessionActive(startDate: string, endDate: string): boolean {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  return now >= start && now <= end;
}

/**
 * Generates a secure random token for sessions
 * @returns random token string
 */
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}