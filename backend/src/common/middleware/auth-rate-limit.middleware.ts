import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const LIMIT = 20;
const WINDOW_MS = 60 * 1000;

interface RateWindow {
  count: number;
  resetAt: number;
}

const stores = new Map<string, RateWindow>();

function requestKey(req: Request): string {
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  const path = req.route?.path ?? req.path;
  return `${ip}:${path}`;
}

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const key = requestKey(req);
    const now = Date.now();

    let window = stores.get(key);
    if (!window || now >= window.resetAt) {
      window = { count: 0, resetAt: now + WINDOW_MS };
      stores.set(key, window);
    }

    if (window.count >= LIMIT) {
      res.status(429).json({
        statusCode: 429,
        timestamp: new Date().toISOString(),
        message: 'Terlalu banyak permintaan ke endpoint autentikasi, coba lagi nanti',
      });
      return;
    }

    window.count += 1;
    next();
  }
}
