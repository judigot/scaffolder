/** Utilities shared by the Hono/Nest parity tests.
 *
 * OpenAPI documents contain a considerable amount of generator metadata.  The
 * parity contract deliberately compares only client-visible semantics.
 */
export type OpenApiDocument = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const metadataKeys = new Set([
  'description',
  'summary',
  'operationId',
  'externalDocs',
  'deprecated',
]);

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    if (metadataKeys.has(key)) continue;
    result[key] = sortValue(value[key]);
  }
  return result;
}

/** Return a stable, semantic projection of an OpenAPI document. */
export function normalizeOpenApiContract(document: OpenApiDocument): unknown {
  const paths = document.paths;
  const projection = { ...document };
  if (isRecord(paths)) {
    projection.paths = Object.fromEntries(
      Object.entries(paths)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([path, value]) => [path, sortValue(value)]),
    );
  }
  delete projection.info;
  delete projection.tags;
  delete projection.servers;
  return sortValue(projection);
}

export function expectEquivalentOpenApiContracts(
  left: OpenApiDocument,
  right: OpenApiDocument,
): void {
  // Kept assertion-library agnostic so this helper can be used from Vitest or
  // the generated project's tests.
  const a = JSON.stringify(normalizeOpenApiContract(left));
  const b = JSON.stringify(normalizeOpenApiContract(right));
  if (a !== b) throw new Error(`OpenAPI contracts differ:\n${a}\n---\n${b}`);
}

export interface ICrudResponse {
  status: number;
  body: unknown;
}

/** Normalizes framework error envelopes while retaining their HTTP semantics. */
export function normalizeClientError(response: ICrudResponse): ICrudResponse {
  if (response.status < 400) return response;
  const body = response.body;
  if (!isRecord(body)) return { status: response.status, body: {} };
  const source = body;
  const message = Array.isArray(source.message)
    ? source.message.join('; ')
    : source.message ?? source.error ?? source.detail;
  return { status: response.status, body: message === undefined ? {} : { message } };
}
