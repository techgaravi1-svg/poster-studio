import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import router from './routes';
import { logger } from './lib/logger';
import { securityHeadersMiddleware, sanitizeInputs, rateLimiter } from './middlewares/security';

const app: Express = express();

// 1. Trust proxy for rate limiting behind reverse proxies (Vercel, Cloudflare, Nginx)
app.set('trust proxy', 1);

// 2. Security response headers (Clickjacking, MIME sniffing, XSS, HSTS)
app.use(securityHeadersMiddleware);

// 3. HTTP Request Logging with sanitized URLs
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split('?')[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

// 4. Secure CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN === '*'
  ? true
  : (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Key'],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
  })
);

// 5. Body Parsing with size limits to accommodate high-res posters and custom print uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 6. Request sanitization (prevents prototype pollution)
app.use(sanitizeInputs);

// 7. Global rate limiting
app.use('/api', rateLimiter({ windowMs: 60 * 1000, maxRequests: 120 }));

// 8. Register API Router
app.use('/api', router);

// 9. 404 Catch-All Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    error: `Error 404: Route not found (${req.method} ${req.path})`,
  });
});

// 10. Centralized Secure Error Handler (Never leak secrets or stack traces to client)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled API Error');

  const statusCode = err.status || err.statusCode || (err.type === 'entity.too.large' ? 413 : 500);
  const errorMessage = err.type === 'entity.too.large'
    ? 'Error 413: Artwork upload payload too large. Please use a compressed image under 20MB.'
    : (statusCode === 500
        ? `Error 500: Internal Server Error. ${err.message || 'An unexpected server error occurred.'}`
        : (err.message || `Error ${statusCode}`));

  res.status(statusCode).json({
    success: false,
    statusCode,
    error: errorMessage,
  });
});

export default app;
