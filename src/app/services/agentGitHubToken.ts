import { Octokit } from '@octokit/rest';

/** Request-scoped client. Octokit errors must not log request credentials. */
export function createAgentTokenClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    log: {
      debug: () => {
        /* Credentials must never reach SDK logs. */
      },
      info: () => {
        /* Credentials must never reach SDK logs. */
      },
      warn: () => {
        /* Credentials must never reach SDK logs. */
      },
      error: () => {
        /* Credentials must never reach SDK logs. */
      },
    },
  });
}

export function redactAgentToken(
  value: unknown,
  token: string | undefined,
): unknown {
  if (token === undefined || token === '') {
    return value;
  }
  if (typeof value === 'string') {
    return value.split(token).join('[REDACTED]');
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => redactAgentToken(item, token));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        redactAgentToken(item, token),
      ]),
    );
  }
  return value;
}
