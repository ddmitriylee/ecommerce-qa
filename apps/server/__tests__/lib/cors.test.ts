import { describe, it, expect, vi } from 'vitest';
import { cors } from '../../lib/cors.js';

function mockReq(method: string, origin = ''): any {
  return { method, headers: { origin } };
}

function mockRes(): any {
  const headers: Record<string, string> = {};
  let statusCode = 0;
  let ended = false;
  const res: any = {
    setHeader(key: string, value: string) { headers[key] = value; },
    getHeader(key: string) { return headers[key]; },
    status(code: number) { statusCode = code; return res; },
    end() { ended = true; },
    get statusCode() { return statusCode; },
    get ended() { return ended; },
    get _headers() { return headers; },
  };
  return res;
}

describe('cors()', () => {
  it('TC-CORS-UNIT-01: sets correct CORS headers for allowed localhost origin', () => {
    const req = mockReq('GET', 'http://localhost:5173');
    const res = mockRes();
    const isPreflight = cors(req, res);

    expect(isPreflight).toBe(false);
    expect(res._headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(res._headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(res._headers['Access-Control-Allow-Headers']).toContain('Authorization');
    expect(res._headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('TC-CORS-UNIT-02: allows *.vercel.app origins', () => {
    const req = mockReq('GET', 'https://my-app.vercel.app');
    const res = mockRes();
    cors(req, res);

    expect(res._headers['Access-Control-Allow-Origin']).toBe('https://my-app.vercel.app');
  });

  it('TC-CORS-UNIT-03: falls back to default origin for disallowed origins', () => {
    const req = mockReq('GET', 'https://evil-site.com');
    const res = mockRes();
    cors(req, res);

    expect(res._headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('TC-CORS-UNIT-04: returns true and sends 204 for OPTIONS preflight', () => {
    const req = mockReq('OPTIONS', 'http://localhost:5173');
    const res = mockRes();
    const isPreflight = cors(req, res);

    expect(isPreflight).toBe(true);
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
  });

  it('TC-CORS-UNIT-05: returns false for non-OPTIONS methods', () => {
    const req = mockReq('POST', 'http://localhost:3000');
    const res = mockRes();
    const isPreflight = cors(req, res);

    expect(isPreflight).toBe(false);
    expect(res._headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });

  it('TC-CORS-EDGE-01: handles empty origin header', () => {
    const req = mockReq('GET', '');
    const res = mockRes();
    cors(req, res);

    // Empty origin is not in allowed list, falls back to default
    expect(res._headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('TC-CORS-UNIT-06: sets Max-Age header for caching', () => {
    const req = mockReq('GET', 'http://localhost:5173');
    const res = mockRes();
    cors(req, res);

    expect(res._headers['Access-Control-Max-Age']).toBe('86400');
  });
});
