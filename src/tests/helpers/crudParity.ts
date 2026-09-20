import { normalizeClientError, type ICrudResponse } from './openapiParity.ts';

export interface ICrudClient {
  request(method: string, path: string, body?: unknown): Promise<ICrudResponse>;
}

export interface ICrudParityOptions {
  collection: string;
  payload: Record<string, unknown>;
  update: Record<string, unknown>;
  id?: string | number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Executes the shared create/read/list/update/delete flow.  Backends supply
 * only a request adapter, which prevents the parity suite from growing
 * framework-specific branches.
 */
export async function runCrudParitySuite(
  client: ICrudClient,
  options: ICrudParityOptions,
): Promise<ICrudResponse[]> {
  const created = await client.request('POST', options.collection, options.payload);
  const id = options.id ?? (isRecord(created.body) ? created.body.id : undefined);
  if ((typeof id !== 'string' && typeof id !== 'number') || Number.isNaN(id)) {
    throw new Error('create response did not contain an id');
  }
  const item = `${options.collection}/${encodeURIComponent(String(id))}`;
  const responses = [created];
  responses.push(await client.request('GET', item));
  responses.push(await client.request('GET', options.collection));
  responses.push(await client.request('PUT', item, options.update));
  responses.push(await client.request('DELETE', item));
  return responses.map(normalizeClientError);
}

export function assertCrudErrorParity(
  left: ICrudResponse,
  right: ICrudResponse,
): void {
  const a = normalizeClientError(left);
  const b = normalizeClientError(right);
  if (a.status !== b.status || JSON.stringify(a.body) !== JSON.stringify(b.body)) {
    throw new Error(`CRUD errors differ: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }
}
