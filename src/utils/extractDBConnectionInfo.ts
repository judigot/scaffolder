function extractDBConnectionInfo(connectionString: string): {
  dbType: string;
  username: string;
  password: string;
  host: string;
  port: number;
  dbName: string;
} {
  const regex =
    /^(?<dbType>[a-z]+):\/\/(?<username>[^:]+):(?<password>[^@]+)@(?<host>[^:]+):(?<port>\d+)\/(?<dbName>[^/]+)$/;
  const match = connectionString.match(regex);

  if (!match?.groups) {
    throw new Error('Invalid connection string format');
  }

  const { dbType, username, password, host, port, dbName } = match.groups;

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
