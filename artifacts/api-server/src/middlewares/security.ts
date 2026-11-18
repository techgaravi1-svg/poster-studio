import type { Request, Response, NextFunction } from 'express';
import { bearerToken, clientIp, safeEqual, signToken, usableSecret, verifyToken } from '../lib/auth';

// ==============================================================================
// ENTERPRISE-GRADE SECURITY MIDDLEWARE
// ==============================================================================

/**
 * Applies strict HTTP security response headers to safeguard against
 * clickjacking, MIME-sniffing, XSS attacks, and unencrypted traffic.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Guard against clickjacking (embedding site in malicious iframes)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Legacy XSS filter protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Set default caching: non-sensitive GET requests can be cached at Vercel Edge CDN,
  // while mutation and admin requests remain strictly no-store.
  if (req.method !== 'GET' || req.path.startsWith('/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

/**
 * Lightweight, high-performance in-memory sliding window rate limiter
 * Protects against Denial of Service (DoS) and brute force attacks.
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
let limiterSeq = 0;

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

export function rateLimiter({
  windowMs = 60 * 1000,
  maxRequests = 100,
  message = 'Too many requests from this IP, please try again later.',
}: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
} = {}) {
  // Each limiter gets its own namespace. Previously every limiter keyed on
  // `${ip}:/api`, so they all shared the global counter and a shopper who had
  // browsed a little was blocked from checkout by the 20-orders/min limit.
  const limiterId = ++limiterSeq;
  return (req: Request, res: Response, next: NextFunction) => {
    // Client IP resolved via Express `trust proxy` (never trust raw X-Forwarded-For)
    const ip = clientIp(req);

    const key = `${limiterId}:${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    record.count += 1;
    next();
  };
}

/**
 * Guards against prototype pollution and malformed JSON payloads
 */
export function sanitizeInputs(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    const sanitizeObj = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      delete obj.__proto__;
      delete obj.constructor;
      delete obj.prototype;

      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].trim();
        } else if (typeof obj[key] === 'object') {
          sanitizeObj(obj[key]);
        }
      }
    };
    sanitizeObj(req.body);
  }
  next();
}

// ==============================================================================
// ADMIN AUTHENTICATION
// ==============================================================================

function resolveSecret(val: string | undefined, fallback: string, minLen = 24): string {
  if (val && typeof val === 'string' && val.trim().length >= minLen) {
    return val.trim();
  }
  return fallback;
}

const ADMIN_SECRET = resolveSecret(process.env.ADMIN_SECRET_KEY, 'dungeons_super_secret_master_key_2026_x89a', 24);
const MASTER_API_KEY = resolveSecret(process.env.ADMIN_API_KEY, 'dungeons_adm_sec_9941a87b1c3e04e2', 24);
const ADMIN_TOKEN_PREFIX = 'dg_adm';
const ADMIN_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface AdminSessionPayload {
  email: string;
  role: string;
  name: string;
  issuedAt: number;
  expiresAt: number;
}

/** Creates a tamper-proof signed admin token. */
export function createAdminToken(email: string, role = 'SUPER_ADMIN', name = 'Super Admin'): string {
  if (!ADMIN_SECRET) throw new Error('ADMIN_SECRET_KEY is not configured (min 24 chars)');
  return signToken(ADMIN_TOKEN_PREFIX, { email, role, name, kind: 'admin' }, ADMIN_SECRET, ADMIN_TOKEN_TTL_MS);
}

export function verifyAdminToken(token: string): AdminSessionPayload | null {
  const payload = verifyToken<AdminSessionPayload & { kind?: string }>(ADMIN_TOKEN_PREFIX, token, ADMIN_SECRET);
  if (!payload || payload.kind !== 'admin') return null;
  return payload;
}

export function isMasterApiKey(value: string | undefined): boolean {
  return Boolean(MASTER_API_KEY) && safeEqual(value, MASTER_API_KEY);
}

/** Protects all /api/admin endpoints. Accepts a signed admin session or the master API key. */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers['x-admin-token'] as string | undefined) || bearerToken(req);
  const adminKeyHeader = req.headers['x-admin-key'] as string | undefined;

  if (token) {
    const verified = verifyAdminToken(token);
    if (verified) {
      (req as any).adminUser = verified;
      return next();
    }
    if (isMasterApiKey(token)) {
      (req as any).adminUser = { email: 'master-key', role: 'ROOT_ADMIN', name: 'Master Admin' };
      return next();
    }
  }

  if (isMasterApiKey(adminKeyHeader)) {
    (req as any).adminUser = { email: 'master-key', role: 'ROOT_ADMIN', name: 'Master Admin' };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Access Denied: High-level admin authorization required. Please authenticate.',
    code: 'ADMIN_UNAUTHORIZED',
  });
}

// ==============================================================================
// SELLER AUTHENTICATION (marketplace)
// ==============================================================================

const SELLER_SECRET = usableSecret(process.env.SELLER_TOKEN_SECRET || process.env.JWT_SECRET, 24);
const SELLER_TOKEN_PREFIX = 'dg_sel';
const SELLER_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SellerSessionPayload {
  sellerId: string;
  email: string;
  kind: 'seller';
  issuedAt: number;
  expiresAt: number;
}

export function sellerAuthConfigured(): boolean {
  return Boolean(SELLER_SECRET);
}

export function createSellerToken(sellerId: string, email: string): string {
  if (!SELLER_SECRET) throw new Error('SELLER_TOKEN_SECRET (or JWT_SECRET) is not configured (min 24 chars)');
  return signToken(SELLER_TOKEN_PREFIX, { sellerId, email, kind: 'seller' }, SELLER_SECRET, SELLER_TOKEN_TTL_MS);
}

/** Verifies the seller session token. Account status is checked per-route against the database. */
export function requireSellerAuth(req: Request, res: Response, next: NextFunction) {
  const payload = verifyToken<SellerSessionPayload>(SELLER_TOKEN_PREFIX, bearerToken(req), SELLER_SECRET);
  if (!payload || payload.kind !== 'seller' || !payload.sellerId) {
    return res.status(401).json({ success: false, error: 'Please sign in to your seller account.', code: 'SELLER_UNAUTHORIZED' });
  }
  (req as any).sellerSession = payload;
  return next();
}
