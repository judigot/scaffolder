/**
 * Utility functions for placeholder processing with security measures
 * These functions are used in template placeholders like {{index()}} and {{timestamp()}}
 */

import {
  PLACEHOLDER_DEFAULTS,
  TIMESTAMP_FORMAT_TOKENS,
} from '@/utils/project-builder/constants/placeholderFunctions.ts';

/**
 * Sanitizes a string to prevent script injection
 * Only allows alphanumeric characters, spaces, and safe punctuation
 * Note: Format strings are parsed by JavaScript, not SQL, so SQL keywords are not relevant
 */
const sanitizeString = (input: string): string => {
  // Remove JavaScript-related keywords that could be used in eval/Function contexts
  // (defense-in-depth, though we only use string replacement, not eval)
  const dangerousKeywords = [
    'EXEC',
    'EXECUTE',
    'SCRIPT',
    'JAVASCRIPT',
    'ONLOAD',
    'ONERROR',
    'EVAL',
    'FUNCTION',
    'CONSTRUCTOR',
    'PROTOTYPE',
  ];
  let sanitized = input;
  for (const keyword of dangerousKeywords) {
    // Match whole word only, case-insensitive
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }

  // Remove any characters that could be used for script injection
  // Allow: alphanumeric, spaces, underscores, hyphens, dots, colons, and format tokens
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s_\-.:YMDHmsXx]/g, '');

  // Clean up multiple spaces and trim
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
};

/**
 * Formats a date according to a format string
 * Supports common format tokens: YYYY, MM, DD, HH, mm, ss, X, x
 *
 * @param format - Format string (e.g., 'YYYY-MM-DD', 'YYYY_MM_DD_HHmmss')
 * @param date - Optional date object (defaults to current date)
 * @param offsetMs - Optional offset in milliseconds to add to the date (for unique timestamps)
 * @returns Formatted date string
 */
export const formatTimestamp = (
  format?: string,
  date: Date = new Date(),
  offsetMs?: number,
): string => {
  // Apply offset if provided (for generating unique timestamps)
  const finalDate =
    offsetMs !== undefined ? new Date(date.getTime() + offsetMs) : date;

  // If no format provided, return ISO 8601 format (JavaScript default)
  if (format === undefined || format.trim() === '') {
    return finalDate.toISOString();
  }

  // Sanitize the format string to prevent injection
  const safeFormat = sanitizeString(format);

  // Extract date components (use UTC methods for consistency)
  const year = finalDate.getUTCFullYear();
  const month = String(finalDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(finalDate.getUTCDate()).padStart(2, '0');
  const hours = String(finalDate.getUTCHours()).padStart(2, '0');
  const minutes = String(finalDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(finalDate.getUTCSeconds()).padStart(2, '0');
  const unixSeconds = Math.floor(finalDate.getTime() / 1000);
  const unixMilliseconds = finalDate.getTime();

  // Replace format tokens using constants
  return safeFormat
    .replace(new RegExp(TIMESTAMP_FORMAT_TOKENS.YEAR_FULL, 'g'), String(year))
    .replace(
      new RegExp(TIMESTAMP_FORMAT_TOKENS.YEAR_SHORT, 'g'),
      String(year).slice(-2),
    )
    .replace(new RegExp(TIMESTAMP_FORMAT_TOKENS.MONTH, 'g'), month)
    .replace(new RegExp(TIMESTAMP_FORMAT_TOKENS.DAY, 'g'), day)
    .replace(new RegExp(TIMESTAMP_FORMAT_TOKENS.HOUR, 'g'), hours)
    .replace(new RegExp(TIMESTAMP_FORMAT_TOKENS.MINUTE, 'g'), minutes)
    .replace(new RegExp(TIMESTAMP_FORMAT_TOKENS.SECOND, 'g'), seconds)
    .replace(
      new RegExp(TIMESTAMP_FORMAT_TOKENS.UNIX_SECONDS, 'g'),
      String(unixSeconds),
    )
    .replace(
      new RegExp(TIMESTAMP_FORMAT_TOKENS.UNIX_MILLISECONDS, 'g'),
      String(unixMilliseconds),
    );
};

/**
 * Formats an index number with optional padding and offset
 *
 * @param base - Base for indexing (0 or 1, default: 0)
 * @param width - Width for zero-padding (default: auto-calculated)
 * @param offset - Offset to add to the index (default: 0)
 * @param total - Total count for auto-width calculation
 * @param currentIndex - Current index (0-based)
 * @returns Formatted index string
 */
export const formatIndex = (
  base: number = PLACEHOLDER_DEFAULTS.INDEX_BASE,
  width?: number | 'auto',
  offset: number = PLACEHOLDER_DEFAULTS.INDEX_OFFSET,
  total?: number,
  currentIndex?: number,
): string => {
  if (currentIndex === undefined) {
    return '';
  }

  // Calculate the actual index value
  const indexValue = currentIndex + base + offset;

  // Calculate width if auto or not provided
  let finalWidth: number;
  if (width === 'auto') {
    if (total !== undefined && total > 0) {
      // Calculate width based on total count
      finalWidth = String(total).length;
    } else {
      // Default to no padding if we can't determine width
      return String(indexValue);
    }
  } else if (width === undefined) {
    // No padding requested - return unpadded value
    return String(indexValue);
  } else {
    finalWidth = width;
  }

  // Ensure width is a positive integer
  if (finalWidth < 1) {
    finalWidth = 1;
  }

  // Pad the index with zeros
  return String(indexValue).padStart(finalWidth, '0');
};

/**
 * Parses function call parameters from a placeholder string
 * Handles both function-style {{index()}} and property-style {{index}}
 *
 * @param placeholder - Placeholder string (e.g., "index(1, 3)" or "index")
 * @returns Object with function name and parsed arguments
 */
export const parseFunctionCall = (
  placeholder: string,
): { functionName: string; args: string[] } => {
  const trimmed = placeholder.trim();

  // Check if it's a function call
  const functionMatch = /^(\w+)\((.*)\)$/.exec(trimmed);

  if (functionMatch) {
    const [, functionName, argsString] = functionMatch;

    // Parse arguments (handle quoted strings and numbers)
    const args: string[] = [];
    if (argsString.trim()) {
      // Simple argument parsing - split by comma, but respect quotes
      let currentArg = '';
      let inQuotes = false;
      let quoteChar = '';

      for (const char of argsString) {
        if ((char === '"' || char === "'") && !inQuotes) {
          inQuotes = true;
          quoteChar = char;
          currentArg += char; // Include opening quote
        } else if (char === quoteChar && inQuotes) {
          inQuotes = false;
          quoteChar = '';
          currentArg += char; // Include closing quote
        } else if (char === ',' && !inQuotes) {
          if (currentArg.trim()) {
            args.push(currentArg.trim());
          }
          currentArg = '';
        } else {
          currentArg += char;
        }
      }

      if (currentArg.trim()) {
        args.push(currentArg.trim());
      }
    }

    return { functionName, args };
  }

  // Not a function call, treat as property access
  return { functionName: trimmed, args: [] };
};

/**
 * Safely parses a numeric argument
 * Returns undefined if the value is not a valid number
 */
const parseNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  // Remove quotes if present
  const unquoted = trimmed.replace(/^["']|["']$/g, '');
  const num = Number(unquoted);
  return Number.isNaN(num) ? undefined : num;
};

/**
 * Processes index() function calls
 *
 * @param args - Function arguments
 * @param currentIndex - Current table index (0-based)
 * @param totalTables - Total number of tables
 * @returns Formatted index string
 */
export const processIndexFunction = (
  args: string[],
  currentIndex: number,
  totalTables: number,
): string => {
  // Default values - no padding unless explicitly specified
  let base = 0;
  let width: number | 'auto' | undefined; // undefined means no padding
  let offset = 0;

  // Parse arguments
  if (args.length > 0) {
    // Check if it's a format string like '001' or '0001' (zero-padded string)
    // This must be checked BEFORE parsing as a number, because '0001' parses to 1
    const cleanedArg = args[0].replace(/^["']|["']$/g, '');
    // Check if it's a numeric string that starts with 0 (format string pattern)
    const isFormatString = /^0+/.test(cleanedArg) && /^\d+$/.test(cleanedArg);
    if (isFormatString) {
      // It's a format string - extract width and use 1-based indexing
      base = 1;
      width = cleanedArg.length;
    } else {
      // Try to parse as a number
      const firstArg = parseNumber(args[0]);
      if (firstArg !== undefined) {
        base = firstArg;
      }
    }
  }

  if (args.length > 1) {
    const secondArg = parseNumber(args[1]);
    if (secondArg !== undefined) {
      width = secondArg;
    } else if (args[1] === 'auto') {
      width = 'auto';
    }
  } else if (args.length === 1 && width === undefined) {
    // If only base is provided and no width, don't pad
    width = undefined;
  }

  if (args.length > 2) {
    const thirdArg = parseNumber(args[2]);
    if (thirdArg !== undefined) {
      offset = thirdArg;
    }
  }

  return formatIndex(base, width, offset, totalTables, currentIndex);
};

/**
 * Processes timestamp() function calls
 *
 * @param args - Function arguments (format string)
 * @param offsetMs - Optional offset in milliseconds to add to the timestamp (for unique timestamps)
 * @returns Formatted timestamp string
 */
export const processTimestampFunction = (
  args: string[],
  offsetMs?: number,
): string => {
  const format =
    args.length > 0 ? args[0].replace(/^["']|["']$/g, '') : undefined;
  return formatTimestamp(format, new Date(), offsetMs);
};
