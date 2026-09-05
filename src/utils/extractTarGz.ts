import { gunzipSync, strFromU8 } from 'fflate';
import { isBinaryFile } from '@/utils/binaryFileUtils.ts';
import type { IExtractedFile } from '@/utils/downloadPublicRepoFiles.ts';

const BLOCK_SIZE = 512;

function readCString(
  bytes: Uint8Array,
  offset: number,
  length: number,
): string {
  const slice = bytes.subarray(offset, offset + length);
  let end = slice.length;
  for (let index = 0; index < slice.length; index += 1) {
    if (slice[index] === 0) {
      end = index;
      break;
    }
  }
  return strFromU8(slice.subarray(0, end));
}

function readOctal(bytes: Uint8Array, offset: number, length: number): number {
  const text = readCString(bytes, offset, length).trim();
  if (text === '') {
    return 0;
  }
  return Number.parseInt(text, 8);
}

function paddedSize(size: number): number {
  if (size === 0) {
    return 0;
  }
  return Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
}

function stripArchiveRoot(path: string): string {
  const slash = path.indexOf('/');
  if (slash === -1) {
    return '';
  }
  return path.slice(slash + 1);
}

export function extractTarGz(archive: Uint8Array): IExtractedFile[] {
  const tar = gunzipSync(archive);
  const files: IExtractedFile[] = [];
  let offset = 0;

  while (offset + BLOCK_SIZE <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK_SIZE);
    const checksumField = readCString(header, 148, 8).trim();
    if (checksumField === '') {
      break;
    }

    const name = readCString(header, 0, 100);
    const prefix = readCString(header, 345, 155);
    const size = readOctal(header, 124, 12);
    const typeFlag = header[156];
    const typeChar = typeFlag === 0 ? '0' : String.fromCharCode(typeFlag);

    offset += BLOCK_SIZE;
    const data = tar.subarray(offset, offset + size);
    offset += paddedSize(size);

    if (typeChar !== '0' && typeChar !== '\0') {
      continue;
    }

    const fullName = prefix === '' ? name : `${prefix}/${name}`;
    if (fullName === '' || fullName.endsWith('/')) {
      continue;
    }

    const cleanedPath = stripArchiveRoot(fullName);
    if (cleanedPath === '') {
      continue;
    }

    const binary = isBinaryFile(cleanedPath);
    if (binary) {
      files.push({
        path: cleanedPath,
        content: Buffer.from(data).toString('base64'),
        isBinary: true,
      });
      continue;
    }

    files.push({
      path: cleanedPath,
      content: strFromU8(data),
      isBinary: false,
    });
  }

  return files;
}
