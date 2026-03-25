import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Set CORS headers on the response.
 * Returns true if this was a preflight (OPTIONS) request and the response was sent.
 */
export function cors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin || '';

  // Allow any *.vercel.app origin or localhost origins
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.vercel.app');

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
