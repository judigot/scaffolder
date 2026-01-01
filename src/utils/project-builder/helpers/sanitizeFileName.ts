/**
 * Enterprise-grade filename sanitization for cross-platform compatibility
 * Handles invalid characters, reserved names, control characters, and edge cases
 *
 * @param fileName - The filename to sanitize
 * @returns Sanitized filename safe for Windows, Linux, and macOS filesystems
 */
export const sanitizeFileName = (fileName: string): string => {
  if (typeof fileName !== 'string' || fileName.length === 0) {
    return 'file';
  }

  let sanitized = fileName;

  // Remove control characters (0x00-0x1F and 0x80-0x9F)
  // These can cause unexpected behavior and security issues
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x80-\x9F]/g, '');

  // Replace or remove invalid characters for cross-platform compatibility
  // Windows invalid: : < > " | ? * / \
  // We replace colons with hyphens (common in timestamps) and remove others
  sanitized = sanitized.replace(/[:<>"|?*\\/]/g, (char) => {
    if (char === ':') {
      return '-'; // Replace colons with hyphens for timestamps
    }
    return ''; // Remove other invalid characters
  });

  // Remove trailing periods and spaces (invalid on Windows)
  sanitized = sanitized.replace(/[.\s]+$/, '');

  // Remove leading spaces and periods (can cause issues)
  sanitized = sanitized.replace(/^[.\s]+/, '');

  // Handle reserved Windows filenames (case-insensitive)
  // CON, PRN, AUX, NUL, COM1-COM9, LPT1-LPT9
  const reservedNames = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
  ];

  // Extract filename without extension for reserved name check
  const nameWithoutExt =
    sanitized.split('.').slice(0, -1).join('.') || sanitized;
  const extension = sanitized.includes('.')
    ? sanitized.split('.').slice(-1)[0]
    : '';

  if (
    reservedNames.some((reserved) => nameWithoutExt.toUpperCase() === reserved)
  ) {
    // Prepend underscore to reserved names
    sanitized = `_${sanitized}`;
  }

  // Enforce maximum filename length (255 characters for most filesystems)
  // We preserve the extension if present
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    if (extension && sanitized.includes('.')) {
      const namePart = sanitized.substring(0, sanitized.lastIndexOf('.'));
      const extPart = sanitized.substring(sanitized.lastIndexOf('.'));
      const maxNameLength = maxLength - extPart.length;
      sanitized = `${namePart.substring(0, maxNameLength)}${extPart}`;
    } else {
      sanitized = sanitized.substring(0, maxLength);
    }
  }

  // Remove multiple consecutive dots (except for extension)
  sanitized = sanitized.replace(/\.{2,}/g, '.');

  // Remove any remaining leading/trailing dots or spaces
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');

  // Remove standalone hyphens (from colon replacements that left nothing else)
  sanitized = sanitized.replace(/^-+$/, '');

  // Final safety check: ensure not empty
  if (sanitized.trim().length === 0) {
    sanitized = 'file';
  }

  return sanitized;
};
