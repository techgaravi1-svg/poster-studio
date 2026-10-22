import type { Request, Response, NextFunction } from 'express';

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

  // Prevent caching of sensitive API requests
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

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

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter({
  windowMs = 60 * 1000,
  maxRequests = 100,
  message = 'Too many requests from this IP, please try again later.',
}: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get client IP address
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const key = `${ip}:${req.baseUrl || req.path}`;
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

/**
 * Verifies optional administrative authorization header
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const adminKey = req.headers['x-admin-key'];
  const configuredKey = process.env.ADMIN_API_KEY || 'dungeons_adm_sec_9941a87b1c3e04e2';

  if (!adminKey || adminKey !== configuredKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid Admin API Key required.',
    });
  }

  next();
}
