import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface TokenPayload {
  sub: string;
  exp: number;
}

/**
 * Sign a payload into a simple HMAC-SHA256 token.
 * Format: base64url(payload) + '.' + base64url(signature)
 */
export function signAdminToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: username, exp: Date.now() + 24 * 60 * 60 * 1000 }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', config.adminSecret).update(payload).digest('base64url');
  return payload + '.' + sig;
}

/**
 * Verify an admin token. Returns the payload if valid, null otherwise.
 */
export function verifyAdminToken(token: string): TokenPayload | null {
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx < 0) return null;
  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  const expected = crypto
    .createHmac('sha256', config.adminSecret)
    .update(payload)
    .digest('base64url');

  try {
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenPayload;
  if (data.exp < Date.now()) return null;
  return data;
}

/**
 * Express middleware that protects admin API routes.
 * Expects an "Authorization: ******" header.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  const decoded = verifyAdminToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  next();
}
