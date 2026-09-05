import { Gunzip, strFromU8 } from 'fflate';
import { isBinaryFile } from '@/utils/binaryFileUtils.ts';
import { concatBytes } from '@/utils/concatBytes.ts';
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
  const chunks: Uint8Array[] = [];
  let total = 0;
  const unzip = new Gunzip((chunk) => {
    total += chunk.length;
    if (total > 100 * 1024 * 1024) {
      throw new Error('Source archive exceeds the 100 MiB extraction limit.');
    }
    chunks.push(chunk);
  });
  for (let start = 0; start < archive.length; start += 4096) {
    unzip.push(
      archive.subarray(start, start + 4096),
      start + 4096 >= archive.length,
    );
  }
  const tar = concatBytes(chunks);
  const files: IExtractedFile[] = [];
  let offset = 0;
  let nextPath: string | undefined;

  while (offset + BLOCK_SIZE <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK_SIZE);
    const checksumField = readCString(header, 148, 8).trim();
    if (checksumField === '') {
      break;
    }

    const name = readCString(header, 0, 100);
    const prefix = readCString(header, 345, 155);
    const size = readOctal(header, 124, 12);
    if (
      !Number.isSafeInteger(size) ||
      size < 0 ||
      offset + BLOCK_SIZE + size > tar.length
    ) {
      throw new Error('Invalid source archive entry size.');
    }
    const typeFlag = header[156];
    const typeChar = typeFlag === 0 ? '0' : String.fromCharCode(typeFlag);

    offset += BLOCK_SIZE;
    const data = tar.subarray(offset, offset + size);
    offset += paddedSize(size);

    if (typeChar === 'x') {
      // POSIX extended headers carry paths longer than the ustar name field.
      let cursor = 0;
      while (cursor < data.length) {
        const space = data.indexOf(32, cursor);
        const length = Number(strFromU8(data.subarray(cursor, space)));
        if (
          space < cursor ||
          !Number.isSafeInteger(length) ||
          length <= space - cursor + 1 ||
          cursor + length > data.length
        ) {
          throw new Error('Invalid source archive extended header.');
        }
        const record = strFromU8(data.subarray(space + 1, cursor + length - 1));
        if (record.startsWith('path=')) {
          nextPath = record.slice(5);
        }
        cursor += length;
      }
      continue;
    }

    const fullName = nextPath ?? (prefix === '' ? name : `${prefix}/${name}`);
    nextPath = undefined;

    if (typeChar !== '0' && typeChar !== '\0') {
      continue;
    }

    if (fullName === '' || fullName.endsWith('/')) {
      continue;
    }

    const cleanedPath = stripArchiveRoot(fullName);
    if (cleanedPath === '') {
      continue;
    }
    if (
      fullName.startsWith('/') ||
      cleanedPath.includes('\\') ||
      cleanedPath
        .split('/')
        .some(
          (part) =>
            part === '.' ||
            part === '..' ||
            part === '' ||
            part.toLowerCase() === '.git',
        )
    ) {
      throw new Error('Unsafe source archive path.');
    }
    if (files.length >= 20_000) {
      throw new Error('Source archive exceeds the 20,000 file limit.');
    }

    const binary = isBinaryFile(cleanedPath);
    if (binary) {
      files.push({
        path: cleanedPath,
        content: btoa(strFromU8(data, true)),
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
