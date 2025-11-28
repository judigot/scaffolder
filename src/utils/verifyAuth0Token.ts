import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import jwksClient, { type JwksClient } from 'jwks-rsa';
import dotenv from 'dotenv';

dotenv.config();

interface IJwtPayloadWithSub extends jwt.JwtPayload {
  sub: string;
}

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
  if (client === null) {
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

export const verifyAuth0Token = async (c: Context, next: Next) => {
  if (AUTH0_DOMAIN === undefined || AUTH0_DOMAIN === '' || client === null) {
    return c.json(
      {
        error: 'Auth0 configuration missing',
        message: 'AUTH0_DOMAIN environment variable is not set',
      },
      500,
    );
  }

  const authHeader = c.req.header('authorization');

  if (
    authHeader === undefined ||
    authHeader === '' ||
    !authHeader.startsWith('Bearer ')
  ) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.substring(7);

  if (token === '' || token.trim() === '') {
    return c.json({ error: 'Token is empty' }, 401);
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
    return c.json(
      {
        error: 'Auth0 API audience not configured',
        message:
          'AUTH0_AUDIENCE environment variable is required for token verification',
      },
      500,
    );
  }

  return new Promise<Response>((resolve) => {
    jwt.verify(token, getKey, verifyOptions, (err, decoded) => {
      if (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        resolve(c.json({ error: 'Invalid token', message: errorMessage }, 401));
        return;
      }

      if (!isJwtPayloadWithSub(decoded)) {
        resolve(c.json({ error: 'Invalid token payload' }, 401));
        return;
      }

      c.set('auth0UserId', decoded.sub);
      void Promise.resolve(next()).then((result) => {
        resolve(result);
      });
    });
  });
};
