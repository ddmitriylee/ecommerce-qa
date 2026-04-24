/**
 * Assignment 3 – Performance Testing
 * Tool: k6 (https://k6.io)
 * Run: k6 run tests/performance/k6-load-test.js
 *
 * Targets the three highest-risk modules identified in the Midterm risk analysis:
 *   1. Authentication (POST /api/auth/login)
 *   2. Product Catalog (GET /api/products)
 *   3. Cart Management (GET /api/cart)
 *
 * Scenarios:
 *   - Smoke Test      :  2 VUs, 30 s   → baseline health check
 *   - Load Test       : 20 VUs, 2 min  → normal expected traffic
 *   - Stress Test     : 50 VUs, 2 min  → peak load (2.5× normal)
 *   - Spike Test      : 0 → 100 VUs in 10 s → sudden burst
 *
 * Thresholds (pass/fail gates):
 *   - http_req_duration p(95) < 500 ms
 *   - http_req_failed   rate  < 1 %
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────────────────────
const errorRate      = new Rate('error_rate');
const authDuration   = new Trend('auth_duration_ms',    true);
const productDuration= new Trend('product_duration_ms', true);
const cartDuration   = new Trend('cart_duration_ms',    true);

// ── Configuration ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'https://ecommerce-olive-pi.vercel.app';

export const options = {
  scenarios: {
    // Phase 1 – Smoke (sanity check)
    smoke: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',
      tags: { scenario: 'smoke' },
    },
    // Phase 2 – Load (normal traffic)
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m',  target: 20 },
        { duration: '30s', target: 0  },
      ],
      startTime: '35s',
      tags: { scenario: 'load' },
    },
    // Phase 3 – Stress (peak load)
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m',  target: 50 },
        { duration: '30s', target: 0  },
      ],
      startTime: '3m',
      tags: { scenario: 'stress' },
    },
    // Phase 4 – Spike (sudden burst)
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0   },
      ],
      startTime: '6m',
      tags: { scenario: 'spike' },
    },
  },

  thresholds: {
    'http_req_duration':          ['p(95)<500'],
    'http_req_failed':            ['rate<0.01'],
    'auth_duration_ms':           ['p(95)<600'],
    'product_duration_ms':        ['p(95)<400'],
    'cart_duration_ms':           ['p(95)<400'],
    'error_rate':                 ['rate<0.01'],
  },
};

// ── Shared headers ───────────────────────────────────────────────────────────
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Pre-seeded test credentials (read-only user seeded in Supabase)
const TEST_EMAIL    = __ENV.TEST_EMAIL    || 'loadtest@example.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'LoadTest123!';

// ── Main virtual-user function ───────────────────────────────────────────────
export default function () {
  let authToken = null;

  // ── Module 1: Authentication ──────────────────────────────────────────────
  group('auth_login', () => {
    const payload = JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const res     = http.post(`${BASE_URL}/api/auth/login`, payload, { headers: JSON_HEADERS });

    authDuration.add(res.timings.duration);
    errorRate.add(res.status >= 400);

    const ok = check(res, {
      'login 200':                (r) => r.status === 200,
      'login returns token':      (r) => r.json('data.session.access_token') !== undefined,
      'login p95 < 500 ms':       (r) => r.timings.duration < 500,
    });

    if (ok && res.status === 200) {
      authToken = res.json('data.session.access_token');
    }
  });

  sleep(0.5);

  // ── Module 2: Product Catalog ─────────────────────────────────────────────
  group('product_catalog', () => {
    // Normal browse
    let res = http.get(`${BASE_URL}/api/products?page=1&limit=12`);
    productDuration.add(res.timings.duration);
    errorRate.add(res.status >= 400);

    check(res, {
      'products 200':             (r) => r.status === 200,
      'products has data':        (r) => Array.isArray(r.json('data')),
      'products p95 < 400 ms':    (r) => r.timings.duration < 400,
    });

    sleep(0.3);

    // Filter by category
    res = http.get(`${BASE_URL}/api/products?category_id=cat-1&min_price=5&max_price=100`);
    productDuration.add(res.timings.duration);
    errorRate.add(res.status >= 400);

    check(res, {
      'filtered products 200':    (r) => r.status === 200,
    });
  });

  sleep(0.5);

  // ── Module 3: Cart Management (authenticated) ─────────────────────────────
  group('cart_management', () => {
    if (!authToken) return;

    const authHeaders = {
      ...JSON_HEADERS,
      'Authorization': `Bearer ${authToken}`,
    };

    let res = http.get(`${BASE_URL}/api/cart`, { headers: authHeaders });
    cartDuration.add(res.timings.duration);
    errorRate.add(res.status >= 400);

    check(res, {
      'cart get 200':             (r) => r.status === 200,
      'cart returns array':       (r) => Array.isArray(r.json('data')),
      'cart p95 < 400 ms':        (r) => r.timings.duration < 400,
    });
  });

  sleep(1);
}

// ── Teardown summary (printed after all VUs finish) ──────────────────────────
export function handleSummary(data) {
  return {
    'tests/performance/results/k6-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Inline text summary helper (bundled with k6)
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const lines  = [`\n${indent}=== k6 Performance Summary ===`];

  const metrics = data.metrics || {};
  const keys    = ['http_req_duration', 'http_req_failed', 'http_reqs',
                   'auth_duration_ms', 'product_duration_ms', 'cart_duration_ms'];

  keys.forEach((key) => {
    if (metrics[key]) {
      const m = metrics[key];
      const v = m.values;
      if (v.p90  !== undefined) lines.push(`${indent}${key}: avg=${v.avg?.toFixed(2)}ms  p90=${v.p90?.toFixed(2)}ms  p95=${v.p95?.toFixed(2)}ms`);
      else if (v.rate !== undefined) lines.push(`${indent}${key}: rate=${(v.rate * 100).toFixed(2)}%`);
      else if (v.count !== undefined) lines.push(`${indent}${key}: count=${v.count}`);
    }
  });

  return lines.join('\n');
}
