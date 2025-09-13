/**
 * Validates Israeli ID number with checksum algorithm
 * @param id - ID number as string
 * @returns boolean indicating if ID is valid
 */
export const validateIsraeliId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;

  // Remove any non-digit characters and trim
  const cleanId = id.replace(/\D/g, '');

  // Must be 8 or 9 digits
  if (!/^\d{8,9}$/.test(cleanId)) return false;

  // Pad to 9 digits if needed
  const paddedId = cleanId.padStart(9, '0');

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const digit = parseInt(paddedId[i]);
    const multiplied = digit * ((i % 2) + 1);

    // If multiplication result is two digits, add them
    sum += multiplied > 9 ? Math.floor(multiplied / 10) + (multiplied % 10) : multiplied;
  }

  // Calculate check digit
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(paddedId[8]);
};

/**
 * Formats Israeli ID number for display
 * @param id - ID number as string
 * @returns formatted ID number
 */
export const formatIsraeliId = (id: string): string => {
  if (!id) return '';

  const cleanId = id.replace(/\D/g, '');
  if (cleanId.length <= 9) {
    return cleanId;
  }

  return cleanId.slice(0, 9);
};

/**
 * Masks Israeli ID number for privacy (shows only last 4 digits)
 * @param id - ID number as string
 * @returns masked ID number
 */
export const maskIsraeliId = (id: string): string => {
  if (!id) return '';

  const cleanId = id.replace(/\D/g, '');
  if (cleanId.length < 4) return '*'.repeat(cleanId.length);

  const masked = '*'.repeat(cleanId.length - 4) + cleanId.slice(-4);
  return masked;
};