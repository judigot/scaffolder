import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const setupTypeMappings = (): void => {
  const yamlFilePath = join(
    process.cwd(),
    'src',
    'files',
    'Constants',
    'typeMappings.yaml',
  );
  const yamlContent = readFileSync(yamlFilePath, 'utf-8');
  const parsedData: unknown = parse(yamlContent);

  if (isRecord(parsedData)) {
    useMockDatabaseStore.setState({ typeMappings: parsedData });
  } else {
    throw new Error('Failed to parse typeMappings.yaml as a record');
  }
};

export const teardownTypeMappings = (): void => {
  useMockDatabaseStore.setState({ typeMappings: undefined });
};
