import type { Request, Response } from 'express';
import app from '../artifacts/api-server/src/app';

export default function handler(req: Request, res: Response) {
  const matchedPath = (req.headers['x-matched-path'] as string) || (req.headers['x-forwarded-uri'] as string);
  if (matchedPath && matchedPath.startsWith('/api')) {
    const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
    req.url = matchedPath.split('?')[0] + query;
  }
  return app(req, res);
}
