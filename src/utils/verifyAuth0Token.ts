import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient, { type JwksClient } from 'jwks-rsa';
import dotenv from 'dotenv';

dotenv.config();

interface IJwtPayloadWithSub extends jwt.JwtPayload {
  sub: string;
}

interface IRequestWithAuth0UserId extends Request {
  auth0UserId?: string;
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
  if (!client) {
    callback(new Error('Auth0 domain not configured'));
    return;
  }

  if (header === null) {
    callback(new Error('No kid in header'));
    return;
  }

  // Type guard for header.kid
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

export function verifyAuth0Token(
  req: IRequestWithAuth0UserId,
  res: Response,
  next: NextFunction,
): void {
  if (AUTH0_DOMAIN === undefined || AUTH0_DOMAIN === '' || client === null) {
    res.status(500).json({
      error: 'Auth0 configuration missing',
      message: 'AUTH0_DOMAIN environment variable is not set',
    });
    return;
  }

  const authHeader = req.headers.authorization;

  if (
    authHeader === undefined ||
    authHeader === '' ||
    !authHeader.startsWith('Bearer ')
  ) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  if (token === '' || token.trim() === '') {
    res.status(401).json({ error: 'Token is empty' });
    return;
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
    res.status(500).json({
      error: 'Auth0 API audience not configured',
      message:
        'AUTH0_AUDIENCE environment variable is required for token verification',
    });
    return;
  }

  jwt.verify(token, getKey, verifyOptions, (err, decoded) => {
    if (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(401).json({ error: 'Invalid token', message: errorMessage });
      return;
    }

    if (!isJwtPayloadWithSub(decoded)) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    req.auth0UserId = decoded.sub;
    next();
  });
}
