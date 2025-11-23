import type { DBTypes } from '@/interfaces/interfaces.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';

interface IDBConnectionInfo {
  dbType: DBTypes;
  username: string;
  password: string;
  host: string;
  port: number;
  dbName: string;
}

export function extractDBConnectionInfo(
  connectionString: string,
): IDBConnectionInfo {
  const regex =
    /^(?<dbType>[a-z]*):\/\/(?<username>[^:]*):(?<password>[^@]*)@(?<host>[^:]*):(?<port>\d*)\/(?<dbName>[^/]*)$/;
  const match = regex.exec(connectionString);

  if (!match?.groups) {
    throw new Error('Invalid connection string format');
  }

  const { dbType, username, password, host, port, dbName } = match.groups;

  try {
    const validDbTypes = useMockDatabaseStore.getState().dbTypes;
    if (validDbTypes && validDbTypes.length > 0) {
      if (!validDbTypes.includes(dbType)) {
        throw new Error(
          `Unsupported database type "${dbType}". Supported types: ${validDbTypes.join(', ')}`,
        );
      }
    }
  } catch {
    if (dbType !== 'postgresql' && dbType !== 'mysql') {
      throw new Error('Unsupported database type');
    }
  }

  const isValidDBType = (type: string): type is DBTypes => {
    return type === 'postgresql' || type === 'mysql';
  };

  if (!isValidDBType(dbType)) {
    throw new Error('Unsupported database type');
  }

  return {
    dbType,
    username,
    password,
    host,
    port: Number(port),
    dbName,
  };
}

export default extractDBConnectionInfo;
