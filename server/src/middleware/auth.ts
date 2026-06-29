// requireAuth — gate for protected routes.
// Expects an `Authorization: Bearer <token>` header, verifies the JWT, and
// attaches { id, email } to req.user. Responds 401 on any failure.

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/token.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
