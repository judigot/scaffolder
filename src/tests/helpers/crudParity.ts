import { normalizeClientError, type CrudResponse } from './openapiParity.ts';

export interface CrudClient {
  request(method: string, path: string, body?: unknown): Promise<CrudResponse>;
}

export interface CrudParityOptions {
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
  client: CrudClient,
  options: CrudParityOptions,
): Promise<CrudResponse[]> {
  const created = await client.request('POST', options.collection, options.payload);
  const id = options.id ?? (isRecord(created.body) ? created.body.id : undefined);
  if (id === undefined || id === null) throw new Error('create response did not contain an id');
  const item = `${options.collection}/${encodeURIComponent(String(id))}`;
  const responses = [created];
  responses.push(await client.request('GET', item));
  responses.push(await client.request('GET', options.collection));
  responses.push(await client.request('PUT', item, options.update));
  responses.push(await client.request('DELETE', item));
  return responses.map(normalizeClientError);
}

export async function assertCrudErrorParity(
  left: CrudResponse,
  right: CrudResponse,
): Promise<void> {
  const a = normalizeClientError(left);
  const b = normalizeClientError(right);
  if (a.status !== b.status || JSON.stringify(a.body) !== JSON.stringify(b.body)) {
    throw new Error(`CRUD errors differ: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }
}
