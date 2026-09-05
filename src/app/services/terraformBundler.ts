import { gzipSync } from 'fflate';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TAR_BLOCK_SIZE = 512;

const createTarHeader = (
  fileName: string,
  fileSize: number,
  mtime: number,
): Uint8Array => {
  const header = new Uint8Array(TAR_BLOCK_SIZE);
  const encoder = new TextEncoder();

  const writePadded = (
    value: string,
    offset: number,
    length: number,
    padChar = '\0',
  ): void => {
    const bytes = encoder.encode(value);
    for (let i = 0; i < length; i++) {
      header[offset + i] = i < bytes.length ? bytes[i] : padChar.charCodeAt(0);
    }
  };

  const writeOctal = (value: number, offset: number, length: number): void => {
    const octal = value.toString(8).padStart(length - 1, '0');
    writePadded(octal, offset, length);
  };

  writePadded(fileName, 0, 100);
  writeOctal(0o644, 100, 8);
  writeOctal(0, 108, 8);
  writeOctal(0, 116, 8);
  writeOctal(fileSize, 124, 12);
  writeOctal(Math.floor(mtime / 1000), 136, 12);
  writePadded('        ', 148, 8);
  header[156] = '0'.charCodeAt(0);
  writePadded('', 157, 100);
  writePadded('ustar', 257, 6);
  writePadded('00', 263, 2);
  writePadded('root', 265, 32);
  writePadded('root', 297, 32);

  let checksum = 0;
  for (let i = 0; i < TAR_BLOCK_SIZE; i++) {
    checksum += header[i];
  }
  const checksumStr = `${checksum.toString(8).padStart(6, '0')}\0 `;
  const checksumBytes = encoder.encode(checksumStr);
  for (let i = 0; i < 8; i++) {
    header[148 + i] = checksumBytes[i] ?? 0;
  }

  return header;
};

const padToBlockSize = (content: Uint8Array): Uint8Array => {
  const padding = TAR_BLOCK_SIZE - (content.length % TAR_BLOCK_SIZE);
  if (padding === TAR_BLOCK_SIZE) {
    return content;
  }
  const padded = new Uint8Array(content.length + padding);
  padded.set(content);
  return padded;
};

export const bundleTerraformTemplate = (templateDir: string): Uint8Array => {
  const files: { name: string; content: Uint8Array; mtime: number }[] = [];

  const entries = readdirSync(templateDir);
  for (const entry of entries) {
    const fullPath = join(templateDir, entry);
    const stat = statSync(fullPath);

    if (stat.isFile() && entry.endsWith('.tf')) {
      const content = readFileSync(fullPath);
      files.push({
        name: entry,
        content: new Uint8Array(content),
        mtime: stat.mtimeMs,
      });
    }
  }

  if (files.length === 0) {
    throw new Error(`No .tf files found in ${templateDir}`);
  }

  const chunks: Uint8Array[] = [];

  for (const file of files) {
    const header = createTarHeader(file.name, file.content.length, file.mtime);
    chunks.push(header);
    chunks.push(padToBlockSize(file.content));
  }

  chunks.push(new Uint8Array(TAR_BLOCK_SIZE * 2));

  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const tarBuffer = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    tarBuffer.set(chunk, offset);
    offset += chunk.length;
  }

  return gzipSync(tarBuffer);
};

export const getTemplatePath = (templateName: string): string => {
  const basePath =
    process.env.NODE_ENV === 'production'
      ? join(process.cwd(), 'infra')
      : join(process.cwd(), 'infra');

  return join(basePath, templateName);
};
