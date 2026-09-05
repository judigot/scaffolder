import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { isRecord } from '@/utils/typeGuards.ts';

export const setupTypeMappings = (): void => {
  const typeMappingsFilePath = join(
    process.cwd(),
    'files',
    'Constants',
    'typeMappings.yaml',
  );
  const typeMappingsContent = readFileSync(typeMappingsFilePath, 'utf-8');
  const parsedTypeMappings: unknown = parse(typeMappingsContent);

  if (isRecord(parsedTypeMappings)) {
    useMockDatabaseStore.setState({ typeMappings: parsedTypeMappings });
  } else {
    throw new Error('Failed to parse typeMappings.yaml as a record');
  }

  const dbTypesFilePath = join(
    process.cwd(),
    'files',
    'Constants',
    'dbTypes.yaml',
  );
  const dbTypesContent = readFileSync(dbTypesFilePath, 'utf-8');
  const parsedDbTypes: unknown = parse(dbTypesContent);

  if (Array.isArray(parsedDbTypes)) {
    const dbTypes = parsedDbTypes.filter(
      (item): item is string => typeof item === 'string',
    );
    useMockDatabaseStore.setState({ dbTypes });
  } else {
    throw new Error('Failed to parse dbTypes.yaml as an array');
  }
};

export const teardownTypeMappings = (): void => {
  useMockDatabaseStore.setState({
    typeMappings: undefined,
    dbTypes: undefined,
  });
};
