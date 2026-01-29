/**
 * Constants for placeholder functions like index() and timestamp()
 * These functions are used in template placeholders like {{index()}} and {{timestamp()}}
 */

export const PLACEHOLDER_FUNCTIONS = {
  INDEX: 'index',
  TIMESTAMP: 'timestamp',
} as const;

export type PlaceholderFunction =
  (typeof PLACEHOLDER_FUNCTIONS)[keyof typeof PLACEHOLDER_FUNCTIONS];

/**
 * Regex patterns for matching placeholder function calls
 */
export const PLACEHOLDER_FUNCTION_REGEX = {
  // Matches {{index}} or {{index()}} or {{index(1)}} or {{index(1, 3)}}
  INDEX: /\{\{index(?:\([^)]*\))?\}\}/g,

  // Matches {{timestamp}} or {{timestamp()}} or {{timestamp('YYYY-MM-DD')}}
  TIMESTAMP: /\{\{timestamp(?:\([^)]*\))?\}\}/g,

  // Generic function call pattern: {{functionName(arg1, arg2, ...)}}
  FUNCTION_CALL: /\{\{(\w+)(?:\(([^)]*)\))?\}\}/g,
} as const;

/**
 * Default values for placeholder functions
 */
export const PLACEHOLDER_DEFAULTS = {
  INDEX_BASE: 0, // 0-based indexing by default
  INDEX_WIDTH: 'auto' as const, // Auto-calculate width
  INDEX_OFFSET: 0, // No offset by default
  TIMESTAMP_FORMAT: undefined, // Use JavaScript default (ISO 8601)
} as const;

/**
 * Supported timestamp format tokens
 */
export const TIMESTAMP_FORMAT_TOKENS = {
  YEAR_FULL: 'YYYY', // 4-digit year (e.g., 2024)
  YEAR_SHORT: 'YY', // 2-digit year (e.g., 24)
  MONTH: 'MM', // 2-digit month (e.g., 01)
  DAY: 'DD', // 2-digit day (e.g., 15)
  HOUR: 'HH', // 2-digit hour 24-hour format (e.g., 12)
  MINUTE: 'mm', // 2-digit minute (e.g., 00)
  SECOND: 'ss', // 2-digit second (e.g., 00)
  UNIX_SECONDS: 'X', // Unix timestamp in seconds
  UNIX_MILLISECONDS: 'x', // Unix timestamp in milliseconds
} as const;

/**
 * Common timestamp format presets
 */
export const TIMESTAMP_FORMAT_PRESETS = {
  ISO_8601: 'YYYY-MM-DDTHH:mm:ss.sssZ', // JavaScript default
  LARAVEL: 'YYYY_MM_DD_HHmmss', // Laravel migration format
  RAILS: 'YYYYMMDDHHmmss', // Rails migration format
  DJANGO: 'YYYYMMDDHHmmss', // Django migration format (same as Rails)
  DATE_ONLY: 'YYYY-MM-DD', // Date only
  DATE_TIME: 'YYYY-MM-DD HH:mm:ss', // Date and time with space
} as const;

/**
 * Common index format presets
 */
export const INDEX_FORMAT_PRESETS = {
  ZERO_BASED: { base: 0, width: 'auto' as const, offset: 0 },
  ONE_BASED: { base: 1, width: 'auto' as const, offset: 0 },
  ZERO_PADDED_3: { base: 1, width: 3, offset: 0 },
  ZERO_PADDED_4: { base: 1, width: 4, offset: 0 },
  DJANGO_STYLE: { base: 1, width: 4, offset: 0 }, // 0001, 0002, etc.
} as const;
