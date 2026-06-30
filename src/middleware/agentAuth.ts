import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

const AGENT_TOKEN_TTL = 8 * 60 * 60 * 1000; // 8 hours

interface AgentTokenPayload {
  sub: string; // agentId
  exp: number;
}

/**
 * Sign a payload into an agent token.
 * Format: ag.<base64url(payload)>.<base64url(hmac)>
 * The "ag." prefix distinguishes agent tokens from admin tokens.
 */
export function signAgentToken(agentId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: agentId, exp: Date.now() + AGENT_TOKEN_TTL }),
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', config.adminSecret)
    .update(`ag.${payload}`)
    .digest('base64url');
  return `ag.${payload}.${sig}`;
}

/**
 * Verify an agent token. Returns the payload if valid, null otherwise.
 */
export function verifyAgentToken(token: string): AgentTokenPayload | null {
  if (!token.startsWith('ag.')) return null;
  const rest = token.slice(3);
  const dotIdx = rest.lastIndexOf('.');
  if (dotIdx < 0) return null;
  const payload = rest.slice(0, dotIdx);
  const sig = rest.slice(dotIdx + 1);

  const expected = crypto
    .createHmac('sha256', config.adminSecret)
    .update(`ag.${payload}`)
    .digest('base64url');

  try {
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AgentTokenPayload;
  if (data.exp < Date.now()) return null;
  return data;
}

/**
 * Express middleware that protects agent portal API routes.
 * Expects an "Authorization: ******" header.
 * Sets res.locals.agentId on success.
 */
export function requireAgentAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  const decoded = verifyAgentToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  res.locals['agentId'] = decoded.sub;
  next();
}
