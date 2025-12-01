import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import jwksClient, { type JwksClient } from 'jwks-rsa';
import dotenv from 'dotenv';

dotenv.config();

interface IJwtPayloadWithSub extends jwt.JwtPayload {
  sub: string;
}

interface IVerifyAuth0TokenResultError {
  ok: false;
  status: 401 | 500;
  body: {
    error: string;
    message?: string;
  };
  auth0UserId?: undefined;
}

interface IVerifyAuth0TokenResultSuccess {
  ok: true;
  status: 200;
  body?: undefined;
  auth0UserId: string;
}

type IVerifyAuth0TokenResult =
  | IVerifyAuth0TokenResultError
  | IVerifyAuth0TokenResultSuccess;

function isJwtPayloadWithSub(
  decoded: jwt.JwtPayload | string | undefined,
): decoded is IJwtPayloadWithSub {
  if (typeof decoded !== 'object') {
    return false;
  }
  return (
    'sub' in decoded && typeof decoded.sub === 'string' && decoded.sub !== ''
  );
}

const AUTH0_DOMAIN = process.env.VITE_AUTH0_DOMAIN;

let client: JwksClient | null = null;

if (AUTH0_DOMAIN !== undefined && AUTH0_DOMAIN !== '') {
  client = jwksClient({
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  });
}

function getKey(
  header: jwt.JwtHeader | null,
  callback: jwt.SigningKeyCallback,
): void {
  if (!client) {
    callback(new Error('Auth0 domain not configured'));
    return;
  }

  if (header === null) {
    callback(new Error('No kid in header'));
    return;
  }

  const kid = header.kid;
  if (kid === undefined || typeof kid !== 'string' || kid === '') {
    callback(new Error('No kid in header'));
    return;
  }

  client.getSigningKey(kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function verifyAuth0TokenFromAuthHeader(
  authHeader: string | undefined,
): Promise<IVerifyAuth0TokenResult> {
  if (AUTH0_DOMAIN === undefined || AUTH0_DOMAIN === '' || client === null) {
    return {
      ok: false,
      status: 500,
      body: {
        error: 'Auth0 configuration missing',
        message: 'AUTH0_DOMAIN environment variable is not set',
      },
    };
  }

  if (
    authHeader === undefined ||
    authHeader === '' ||
    !authHeader.startsWith('Bearer ')
  ) {
    return {
      ok: false,
      status: 401,
      body: { error: 'Missing or invalid authorization header' },
    };
  }

  const token = authHeader.substring(7);

  if (token === '' || token.trim() === '') {
    return {
      ok: false,
      status: 401,
      body: { error: 'Token is empty' },
    };
  }

  const verifyOptions: jwt.VerifyOptions = {
    issuer: `https://${AUTH0_DOMAIN}/`,
    algorithms: ['RS256'],
  };

  const audience = process.env.VITE_AUTH0_AUDIENCE;
  if (
    audience !== undefined &&
    audience !== '' &&
    typeof audience === 'string'
  ) {
    verifyOptions.audience = audience;
  } else {
    return {
      ok: false,
      status: 500,
      body: {
        error: 'Auth0 API audience not configured',
        message:
          'AUTH0_AUDIENCE environment variable is required for token verification',
      },
    };
  }

  return await new Promise<IVerifyAuth0TokenResult>((resolve) => {
    jwt.verify(token, getKey, verifyOptions, (err, decoded) => {
      if (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        resolve({
          ok: false,
          status: 401,
          body: { error: 'Invalid token', message: errorMessage },
        });
        return;
      }

      if (!isJwtPayloadWithSub(decoded)) {
        resolve({
          ok: false,
          status: 401,
          body: { error: 'Invalid token payload' },
        });
        return;
      }

      resolve({
        ok: true,
        status: 200,
        auth0UserId: decoded.sub,
      });
    });
  });
}

export async function verifyAuth0Token(
  c: Context,
  next: Next,
): Promise<Response | undefined> {
  const result = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!result.ok) {
    return c.json(result.body, result.status);
  }

  c.set('auth0UserId', result.auth0UserId);
  await next();
}
