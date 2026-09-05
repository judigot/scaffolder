import { createHash, timingSafeEqual } from 'node:crypto';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

interface IAuthVerifyFailure {
  ok: false;
  status: 401 | 500;
  body: {
    error: string;
    message?: string;
  };
  auth0UserId?: undefined;
}

interface IAuthVerifySuccess {
  ok: true;
  status: 200;
  body?: undefined;
  auth0UserId: string;
}

export type IAgentScaffoldAuthResult = IAuthVerifyFailure | IAuthVerifySuccess;

type IAuth0Verifier = (
  authorizationHeader: string | undefined,
) => Promise<IAgentScaffoldAuthResult>;

export interface IVerifyAgentScaffoldAuthOptions {
  agentApiKey?: string | null;
  verifyAuth0?: IAuth0Verifier;
}

export const AGENT_AUTH_SUBJECT = 'scaffolder-agent';

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function secretsMatch(left: string, right: string): boolean {
  return timingSafeEqual(sha256(left), sha256(right));
}

export function extractBearerToken(
  authorizationHeader: string | undefined,
): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }
  const trimmed = authorizationHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = trimmed.slice('bearer '.length).trim();
  if (token === '') {
    return null;
  }
  return token;
}

function configuredAgentApiKey(
  override: string | null | undefined,
): string | null {
  if (override !== undefined) {
    if (override === null || override.trim() === '') {
      return null;
    }
    return override;
  }
  const fromEnv: unknown = process.env.SCAFFOLDER_AGENT_API_KEY;
  if (typeof fromEnv !== 'string' || fromEnv.trim() === '') {
    return null;
  }
  return fromEnv;
}

export async function verifyAgentScaffoldAuth(
  authorizationHeader: string | undefined,
  options: IVerifyAgentScaffoldAuthOptions = {},
): Promise<IAgentScaffoldAuthResult> {
  const configuredKey = configuredAgentApiKey(options.agentApiKey);
  const presentedToken = extractBearerToken(authorizationHeader);

  if (configuredKey !== null && presentedToken !== null) {
    if (secretsMatch(presentedToken, configuredKey)) {
      return {
        ok: true,
        status: 200,
        auth0UserId: AGENT_AUTH_SUBJECT,
      };
    }
  }

  const verifyAuth0 = options.verifyAuth0 ?? verifyAuth0TokenFromAuthHeader;
  return verifyAuth0(authorizationHeader);
}
