import type { IStructure } from '@/components/FileViewer.tsx';

const LEFTOVER_TEMPLATE_MARKER_PATTERN =
  /<@@>[^<]*<\/@@>|<\/?@@[A-Z]+@@[^>]*>/g;

const BINARY_FILE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.ico',
  '.webp',
  '.bmp',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.pdf',
]);

export interface ILeftoverTemplateMarkerLocation {
  filePath: string;
  markers: string[];
}

export function findLeftoverTemplateMarkersInText(content: string): string[] {
  const matches = content.match(LEFTOVER_TEMPLATE_MARKER_PATTERN);
  if (matches === null) {
    return [];
  }
  return [...new Set(matches)];
}

function isBinaryFileName(fileName: string): boolean {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return false;
  }
  return BINARY_FILE_EXTENSIONS.has(fileName.slice(lastDotIndex).toLowerCase());
}

export function detectLeftoverTemplateMarkers(
  structure: IStructure,
  basePath = '',
): ILeftoverTemplateMarkerLocation[] {
  const locations: ILeftoverTemplateMarkerLocation[] = [];

  for (const item of structure) {
    const currentPath =
      basePath === '' ? item.name : `${basePath}/${item.name}`;

    if (item.type === 'file') {
      if (item.isBinary === true || isBinaryFileName(item.name)) {
        continue;
      }
      const markers = findLeftoverTemplateMarkersInText(item.content);
      if (markers.length > 0) {
        locations.push({
          filePath: currentPath,
          markers,
        });
      }
    } else {
      locations.push(
        ...detectLeftoverTemplateMarkers(item.children, currentPath),
      );
    }
  }

  return locations;
}
