const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.mp3',
  '.mp4',
  '.wav',
  '.ogg',
  '.webm',
  '.avi',
  '.mov',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
]);
export function isBinaryFile(filename) {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return false;
  }
  const ext = filename.slice(lastDotIndex).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}
