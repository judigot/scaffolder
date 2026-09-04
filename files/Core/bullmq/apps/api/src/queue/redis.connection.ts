export interface IRedisConnection {
  host: string;
  port: number;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return value;
}

export function parseRedisConnection(
  source: NodeJS.ProcessEnv = process.env,
): IRedisConnection {
  const host = emptyToUndefined(source.REDIS_HOST) ?? '127.0.0.1';
  const portRaw = emptyToUndefined(source.REDIS_PORT) ?? '6379';
  const port = Number(portRaw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid REDIS_PORT: ${portRaw}`);
  }

  return { host, port };
}
