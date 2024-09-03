interface IDBConnectionInfo {
  dbType: 'postgresql' | 'mysql';
  username: string;
  password: string;
  host: string;
  port: number;
  dbName: string;
}

function extractDBConnectionInfo(connectionString: string): IDBConnectionInfo {
  const regex =
    /^(?<dbType>[a-z]*):\/\/(?<username>[^:]*):(?<password>[^@]*)@(?<host>[^:]*):(?<port>\d*)\/(?<dbName>[^/]*)$/;
  const match = connectionString.match(regex);

  if (!match?.groups) {
    throw new Error('Invalid connection string format');
  }

  const { dbType, username, password, host, port, dbName } = match.groups;

  if (dbType !== 'postgresql' && dbType !== 'mysql') {
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
