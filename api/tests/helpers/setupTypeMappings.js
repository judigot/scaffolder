import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { useMockDatabaseStore } from '../../useMockDatabaseStore';
const isRecord = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};
export const setupTypeMappings = () => {
  const typeMappingsFilePath = join(
    process.cwd(),
    'src',
    'files',
    'Constants',
    'typeMappings.yaml',
  );
  const typeMappingsContent = readFileSync(typeMappingsFilePath, 'utf-8');
  const parsedTypeMappings = parse(typeMappingsContent);
  if (isRecord(parsedTypeMappings)) {
    useMockDatabaseStore.setState({ typeMappings: parsedTypeMappings });
  } else {
    throw new Error('Failed to parse typeMappings.yaml as a record');
  }
  const dbTypesFilePath = join(
    process.cwd(),
    'src',
    'files',
    'Constants',
    'dbTypes.yaml',
  );
  const dbTypesContent = readFileSync(dbTypesFilePath, 'utf-8');
  const parsedDbTypes = parse(dbTypesContent);
  if (Array.isArray(parsedDbTypes)) {
    const dbTypes = parsedDbTypes.filter((item) => typeof item === 'string');
    useMockDatabaseStore.setState({ dbTypes });
  } else {
    throw new Error('Failed to parse dbTypes.yaml as an array');
  }
};
export const teardownTypeMappings = () => {
  useMockDatabaseStore.setState({
    typeMappings: undefined,
    dbTypes: undefined,
  });
};
