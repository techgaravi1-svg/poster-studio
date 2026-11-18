import crypto from 'node:crypto';
import type { Request } from 'express';

// ==============================================================================
// SHARED AUTH PRIMITIVES (password hashing, signed tokens, constant-time compare)
// ==============================================================================

/** Constant-time string comparison that never throws on length mismatch. */
export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb) && a.length === b.length;
}

/**
 * Optional set of permanently revoked credential hashes.
 */
const COMPROMISED_SECRET_HASHES = new Set<string>();

export function isCompromisedSecret(value: string | undefined | null): boolean {
  if (!value) return false;
  return COMPROMISED_SECRET_HASHES.has(crypto.createHash('sha256').update(value).digest('hex'));
}

/** Returns the env secret, or '' if it is missing, too short, or known to be leaked. */
export function usableSecret(value: string | undefined, minLength = 12): string {
  if (!value || value.length < minLength || isCompromisedSecret(value)) return '';
  return value;
}

// ------------------------------------------------------------------------------
// Password hashing (scrypt, built into Node — no native dependency required)
// ------------------------------------------------------------------------------

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, salt, hash] = stored.split('$');
    if (algo !== 'scrypt' || !salt || !hash) return false;
    const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------------
// Signed tokens: <prefix>.<base64url payload>.<base64url HMAC-SHA256>
// ------------------------------------------------------------------------------

export function signToken<T extends object>(prefix: string, payload: T, secret: string, ttlMs: number): string {
  if (!secret) throw new Error(`Signing secret for ${prefix} tokens is not configured`);
  const body = { ...payload, issuedAt: Date.now(), expiresAt: Date.now() + ttlMs };
  const payloadB64 = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${prefix}.${payloadB64}`).digest('base64url');
  return `${prefix}.${payloadB64}.${signature}`;
}

export function verifyToken<T>(prefix: string, token: string | undefined, secret: string): (T & { issuedAt: number; expiresAt: number }) | null {
  try {
    if (!secret || !token) return null;
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== prefix) return null;
    const [, payloadB64, signature] = parts;
    const expected = crypto.createHmac('sha256', secret).update(`${prefix}.${payloadB64}`).digest('base64url');
    if (!safeEqual(signature, expected)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (typeof payload?.expiresAt !== 'number' || Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  return undefined;
}

/**
 * Client IP as resolved by Express using the `trust proxy` setting.
 * Never read X-Forwarded-For directly: its first entry is attacker-controlled,
 * which would let anyone bypass rate limits and login lockouts.
 */
export function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown-ip';
}
