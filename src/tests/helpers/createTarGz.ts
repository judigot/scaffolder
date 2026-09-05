import { gzipSync } from 'fflate';

const BLOCK = 512;

function writeString(block: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    block[offset + index] = value.charCodeAt(index);
  }
}

function writeOctal(
  block: Uint8Array,
  offset: number,
  length: number,
  value: number,
): void {
  const text = value.toString(8).padStart(length - 1, '0');
  writeString(block, offset, text);
}

function checksum(header: Uint8Array): number {
  let sum = 0;
  for (const byte of header) {
    sum += byte;
  }
  return sum;
}

export function createTarGz(
  files: { path: string; content: string }[],
): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const file of files) {
    const content = new TextEncoder().encode(file.content);
    const header = new Uint8Array(BLOCK);
    writeString(header, 0, file.path);
    writeOctal(header, 124, 12, content.length);
    header[156] = '0'.charCodeAt(0);
    writeString(header, 257, 'ustar');
    writeString(header, 148, '        ');
    const sum = checksum(header);
    writeOctal(header, 148, 8, sum);
    chunks.push(header);
    const padded = new Uint8Array(Math.ceil(content.length / BLOCK) * BLOCK);
    padded.set(content);
    chunks.push(padded);
  }
  chunks.push(new Uint8Array(BLOCK * 2));
  const total = chunks.reduce((size, chunk) => size + chunk.length, 0);
  const tar = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    tar.set(chunk, offset);
    offset += chunk.length;
  }
  return gzipSync(tar);
}
