// JWT signing and verification (jsonwebtoken).
// The token carries the user id (sub) and email; /me re-reads the DB for fresh profile data.

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface TokenPayload {
  sub: number; // user id
  email: string;
}

// Fail loudly if the secret is missing, rather than signing with an empty key.
function secret(): string {
  if (!config.jwt.secret) {
    throw new Error('JWT_SECRET is not set — add it to the repo-root .env');
  }
  return config.jwt.secret;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: config.jwt.expiresInSeconds });
}

export function verifyToken(token: string): TokenPayload {
  // jwt.verify returns string | JwtPayload; our tokens are always objects,
  // so narrow through `unknown` to our known payload shape.
  return jwt.verify(token, secret()) as unknown as TokenPayload;
}
