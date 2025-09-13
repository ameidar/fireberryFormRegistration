import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * Formats a date string or Date object for display in Hebrew
 */
export const formatDate = (date: string | Date, pattern: string = 'dd/MM/yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, pattern, { locale: he });
  } catch {
    return '';
  }
};

/**
 * Formats a date string or Date object for display with time in Hebrew
 */
export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Returns relative time string (e.g., "2 days ago") in Hebrew
 */
export const formatRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: he });
  } catch {
    return '';
  }
};

/**
 * Checks if a date is in the past
 */
export const isPast = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) && dateObj < new Date();
  } catch {
    return false;
  }
};

/**
 * Checks if a date is in the future
 */
export const isFuture = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) && dateObj > new Date();
  } catch {
    return false;
  }
};