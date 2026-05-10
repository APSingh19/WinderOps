import { randomToken } from '../utils/tokens.js';
import { parseCookies } from '../utils/cookies.js';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const csrfExemptPaths = ['/api/auth/login', '/api/auth/signup', '/api/auth/refresh', '/api/auth/forgot-password', '/api/auth/reset-password'];

export const csrfProtection = (req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie);
  if (!req.cookies.csrf_token) {
    res.cookie('csrf_token', randomToken(), {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }
  if (!unsafeMethods.has(req.method) || csrfExemptPaths.some((path) => req.path.startsWith(path))) return next();
  if (!req.cookies.refresh_token && !req.cookies.access_token) return next();
  if (req.headers['x-csrf-token'] && req.headers['x-csrf-token'] === req.cookies.csrf_token) return next();
  res.status(403);
  next(new Error('Invalid CSRF token'));
};
