# Assignment 3: Experimental Engineering Report
## Performance / Mutation / Chaos Testing
**Project:** E-Commerce Platform (Monorepo)  
**Author:** QA Engineering  
**Date:** April 24, 2026  
**Assignment Deadline:** Week 7  

---

## Table of Contents

1. [System Overview & Environment](#1-system-overview--environment)
2. [Performance Testing](#2-performance-testing)
3. [Mutation Testing](#3-mutation-testing)
4. [Chaos / Fault Injection Testing](#4-chaos--fault-injection-testing)
5. [Comparative Analysis: Expected vs Actual](#5-comparative-analysis-expected-vs-actual)
6. [Metrics Summary](#6-metrics-summary)
7. [Lessons Learned & Recommendations](#7-lessons-learned--recommendations)

---

## 1. System Overview & Environment

### 1.1 System Description

The system under test is a full-stack e-commerce monorepo consisting of:

| Layer | Technology | Deployment |
|-------|-----------|-----------|
| **Client** | React 19, TypeScript, Vite, TailwindCSS, Zustand | Vercel (SPA) |
| **Server** | TypeScript serverless functions (`@vercel/node`) | Vercel Functions |
| **Database** | Supabase (PostgreSQL) | Supabase Cloud |
| **Auth** | Supabase Auth (JWT) | Supabase Cloud |

The server exposes 12 API endpoints across 7 modules:
- `api/auth/` — login, register, refresh
- `api/products/` — list, detail
- `api/cart/` — CRUD cart items
- `api/orders/` — create, list, get by ID
- `api/categories/` — list
- `api/users/` — profile CRUD
- `api/admin/` — stats dashboard

### 1.2 High-Risk Modules (from Midterm Risk Analysis)

Based on the Midterm risk analysis, three modules were identified as the highest-risk targets:

| Priority | Module | Risk Factors |
|----------|--------|-------------|
| 🔴 High | **Cart Management** (`api/cart/`) | Complex state mutation, concurrency potential, financial impact |
| 🔴 High | **Authentication** (`api/auth/login`) | Security-critical, entry point for all protected endpoints |
| 🔴 High | **Order Placement** (`api/orders/`) | Multi-table transactions, stock depletion, revenue impact |

### 1.3 Experimental Setup

| Item | Details |
|------|---------|
| **OS** | macOS 14 (Darwin) |
| **Node.js** | v22.x (LTS) |
| **Test Framework** | Vitest v4.1.4 |
| **E2E Framework** | Playwright v1.58 |
| **Performance Tool** | k6 script + Vitest-based concurrent simulation |
| **Mutation Tool** | Custom runner (`tests/mutation/mutation-runner.mjs`) |
| **Chaos Method** | Mock-based fault injection (Vitest) |
| **CI/CD** | GitHub Actions |
| **Coverage** | V8 via `@vitest/coverage-v8` |

### 1.4 Reproducibility

```bash
# All tests (unit + integration + performance + chaos)
cd apps/server && npm test

# Mutation testing
npm run mutation

# Performance tests
npm run test:perf

# Chaos tests
npm run test:chaos

# Coverage report
cd apps/server && npm run coverage

# k6 production load test (requires k6 installed)
k6 run tests/performance/k6-load-test.js \
  -e BASE_URL=https://ecommerce-olive-pi.vercel.app \
  -e TEST_EMAIL=loadtest@example.com \
  -e TEST_PASSWORD=LoadTest123!
```

---

## 2. Performance Testing

### 2.1 Methodology

**Tool:** Vitest-based concurrent simulation (handler-level, no live server required) + k6 script in `tests/performance/k6-load-test.js` for production use.

Handler functions are invoked directly with mocked Supabase clients to isolate pure application logic performance and enable reproducible CI/CD measurement.

**Four test scenarios were designed:**

| Scenario | VUs / Concurrency | Duration | Purpose |
|----------|------------------|----------|---------|
| Smoke | 2 | 30 s | Sanity check |
| Load | 20 | 2 min (ramp + hold) | Normal daily traffic |
| Stress | 50 | 2 min | 2.5× normal peak |
| Spike | 200 concurrent | Instant burst | Flash sale simulation |

**Thresholds (production k6 / CI gates):**
- `http_req_duration p(95) < 500 ms`
- `http_req_failed rate < 1%`

### 2.2 Test Execution & Results

#### Module 1: Authentication (POST /api/auth/login)

**PERF-AUTH-01 — 50 Concurrent Login Requests**

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Average latency | 0.42 ms | — | ✅ |
| p50 latency | 0.31 ms | — | ✅ |
| p95 latency | 1.18 ms | < 50 ms | ✅ PASS |
| p99 latency | 1.54 ms | — | ✅ |
| Error rate | 0.0% | < 1% | ✅ PASS |
| Throughput est. | ~2,380 rps | — | ✅ |

**PERF-AUTH-02 — 100 Sequential (Degradation Check)**

| Metric | Value | Status |
|--------|-------|--------|
| p95 latency | 1.1 ms | ✅ |
| First 10 avg | 0.38 ms | — |
| Last 10 avg | 0.29 ms | ✅ No degradation |

> ✅ **Result:** Authentication handler shows no latency degradation. Zero errors across all 150 requests.

---

#### Module 2: Product Catalog (GET /api/products)

**PERF-PROD-01 — 100 Concurrent Requests**

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Average latency | 0.28 ms | — | ✅ |
| p95 latency | 0.62 ms | < 30 ms | ✅ PASS |
| Throughput est. | ~3,571 rps | — | ✅ |
| Error count | 0 / 100 | 0 | ✅ PASS |

**PERF-PROD-02 — 50 Filtered Search Requests**

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| p95 latency | 0.49 ms | < 30 ms | ✅ PASS |

> ✅ **Result:** Product catalog is the fastest module. No bottlenecks detected under filter + pagination load.

---

#### Module 3: Cart Management (GET + POST /api/cart)

**PERF-CART-01 — 50 Concurrent GET Requests**

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Average latency | 0.38 ms | — | ✅ |
| p95 latency | 0.91 ms | < 40 ms | ✅ PASS |
| Error count | 0 / 50 | 0 | ✅ PASS |

**PERF-CART-02 — SPIKE: 200 Concurrent POST Requests**

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Average latency | 0.51 ms | — | ✅ |
| p95 latency | 1.42 ms | — | ✅ |
| p99 latency | 2.01 ms | — | ✅ |
| Error rate | 0.0% | < 1% | ✅ PASS |

> ✅ **Result:** Cart handler correctly handles 200 simultaneous requests with zero errors under spike conditions.

### 2.3 Performance Bottleneck Analysis

| Module | Observed Behaviour | Risk | Recommendation |
|--------|-------------------|------|----------------|
| Authentication | Fast, no degradation | 🟡 Medium | Add token caching to reduce DB calls per request |
| Product Catalog | Fastest module | 🟢 Low | Add pagination count caching for large catalogs |
| Cart Management | Stable under spike | 🟡 Medium | Add DB-level upsert to prevent concurrent INSERT race |

> **Production note:** With Supabase network latency (~50-150 ms), real response times will be 100-300 ms — well within the 500 ms SLA. The provided k6 script enables verification against the live Vercel deployment.

---

## 3. Mutation Testing

### 3.1 Methodology

**Tool:** Custom Node.js runner (`tests/mutation/mutation-runner.mjs`)

For each mutant: back up file → apply mutation → run full `npm test` → record Killed/Survived → restore file.

**Mutation types applied:**
- **Logical Operator** — flip conditions
- **Constant Alteration** — change numeric/string literals
- **Return Value Modification** — alter return values
- **Function Call Removal** — remove guard clauses

### 3.2 Results — Module 1: `lib/auth.ts`

| ID | Type | Mutation | Status |
|----|------|---------|--------|
| MUT-AUTH-01 | Logical Operator | `!auth?.startsWith('Bearer ')` → `auth?.startsWith(...)` | ✅ KILLED |
| MUT-AUTH-02 | Return Value | `auth.slice(7)` → `auth` (full header returned) | ✅ KILLED |
| MUT-AUTH-03 | Return Value | `return data.user` → `return null` | ✅ KILLED |
| MUT-AUTH-04 | Function Removal | Remove `if (!token) return null` guard | ✅ KILLED |
| MUT-AUTH-05 | Constant | `res.status(401)` → `res.status(200)` | ✅ KILLED |
| MUT-AUTH-06 | Constant | `role !== 'admin'` → `role !== 'user'` | ✅ KILLED |

**Score: 6/6 = 100%**

### 3.3 Results — Module 2: `lib/errors.ts`

| ID | Type | Mutation | Status |
|----|------|---------|--------|
| MUT-ERR-01 | Logical Operator | Negate `instanceof AppError` check | ✅ KILLED |
| MUT-ERR-02 | Constant | `res.status(500)` → `res.status(200)` in fallback | ✅ KILLED |
| MUT-ERR-03 | Constant | `sendSuccess` default `status = 200` → `500` | ✅ KILLED |
| MUT-ERR-04 | Return Value | `{ data, error: null }` → `{ data: null, error: 'mutated' }` | ✅ KILLED |
| MUT-ERR-05 | Constant | `res.status(405)` → `res.status(200)` | ✅ KILLED |

**Score: 5/5 = 100%**

### 3.4 Results — Module 3: `api/cart/index.ts`

| ID | Type | Mutation | Status |
|----|------|---------|--------|
| MUT-CART-01 | Logical Operator | Remove `quantity < 1` check (allow 0) | ✅ KILLED |
| MUT-CART-02 | Constant | POST returns `200` instead of `201` | ✅ KILLED |
| MUT-CART-03 | Function Removal | Remove `user_id` filter on GET | ✅ KILLED |
| MUT-CART-04 | Logical Operator | `if (existing)` → `if (!existing)` | ✅ KILLED |
| MUT-CART-05 | Function Removal | Change `user_id` value to `''` on DELETE | ⚠️ **SURVIVED** |

**Score: 4/5 = 80%**

### 3.5 Overall Mutation Score

| Module | Created | Killed | Survived | Score |
|--------|---------|--------|----------|-------|
| `lib/auth.ts` | 6 | 6 | 0 | **100%** |
| `lib/errors.ts` | 5 | 5 | 0 | **100%** |
| `api/cart/index.ts` | 5 | 4 | 1 | **80%** |
| **Overall** | **16** | **15** | **1** | **93.8%** |

### 3.6 Surviving Mutant Analysis — MUT-CART-05

**Mutation:** Changed `.eq('user_id', user.id)` → `.eq('user_id', '')` in DELETE /cart

**Why it survived:** The existing test `TC-CART-UNIT-04` asserts `{ cleared: true }` and status 200, but does *not* assert which user's cart was targeted. The Supabase mock returns `{ error: null }` regardless of the `user_id` value.

**Production impact:** This is a **critical security bug** — the mutation causes DELETE to silently scope to a non-existent user, leaving the real user's cart intact. The test gives false confidence.

**Fix — add to `cart.test.ts`:**
```typescript
it('TC-CART-UNIT-07: DELETE /cart only clears the authenticated users cart', async () => {
  vi.mocked(requireAuth).mockResolvedValue(MOCK_USER as any);
  const deleteMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue({ delete: deleteMock }) } as any);

  await handler(mockReq('DELETE', {}, {}, { authorization: 'Bearer valid' }), mockRes());

  // Assert correct user_id scoping
  const eqMock = deleteMock.mock.results[0].value.eq;
  expect(eqMock).toHaveBeenCalledWith('user_id', 'user-123');
});
```

---

## 4. Chaos / Fault Injection Testing

### 4.1 Methodology

**Tool:** Vitest-based fault injection (16 tests, 4 groups)

Failure modes injected: DB crash, slow DB response, partial write, cascade failure, malformed input, transient + recovery, error message leakage.

### 4.2 Results — Group 1: Authentication (CHAOS-01)

| Test | Fault | Expected | Actual | Status |
|------|-------|---------|--------|--------|
| CHAOS-AUTH-01 | DB unreachable (ECONNREFUSED) | ≥ 400, no crash | 500 — "Internal server error" | ✅ PASS |
| CHAOS-AUTH-02 | Auth returns null data | ≥ 400, no crash | 400 — auth error | ✅ PASS |
| CHAOS-AUTH-03 | Slow auth service (300 ms) | 200, completes | 200 — in 300+ ms | ✅ PASS |
| CHAOS-AUTH-04 | SQL injection in email | < 500, no crash | 400 — "Invalid credentials" | ✅ PASS |

> **Finding:** All auth errors properly masked. Slow responses handled without timeout. SQL injection strings are safely passed to Supabase which rejects them at the auth layer.

### 4.3 Results — Group 2: Cart (CHAOS-02)

| Test | Fault | Expected | Actual | Status |
|------|-------|---------|--------|--------|
| CHAOS-CART-01 | DB down on GET /cart | 500, error not leaked | 500 — "Internal server error" ✓ | ✅ PASS |
| CHAOS-CART-02 | SELECT succeeds, INSERT fails | 500, no crash | 500 | ✅ PASS |
| CHAOS-CART-03 | Slow DB on DELETE (500 ms) | 200, completes | 200 — in ~500 ms | ✅ PASS |
| CHAOS-CART-04 | PUT non-existent item | 404 | 404 — "Cart item not found" | ✅ PASS |
| CHAOS-CART-05 | XSS string as product_id | No crash | 201 (passes thru to DB) | ✅ PASS |

> **Finding:** Internal error `"pg_shadow table is corrupt: internal detail"` was verified **NOT** present in any API response — the `handleError()` boundary is functioning correctly.

### 4.4 Results — Group 3: Orders Cascade (CHAOS-03)

| Test | Fault | Expected | Actual | Status |
|------|-------|---------|--------|--------|
| CHAOS-ORDER-01 | cart_items table locked | ≥ 400, no crash | 500 | ✅ PASS |
| CHAOS-ORDER-02 | orders INSERT fails after cart fetch | 500, no crash | 500 | ✅ PASS |
| CHAOS-ORDER-03 | Empty cart → place order | 400, clear error | 400 — "Cart is empty" | ✅ PASS |
| CHAOS-ORDER-04 | order_items FK violation after order created | 500 | 500 | ✅ PASS |
| CHAOS-ORDER-05 | Transient failure → retry | Fail #1, succeed #2 | 500 then 201 ✓ | ✅ PASS |

> ⚠️ **CHAOS-ORDER-04 reveals a production risk:** If `order_items` INSERT fails after `orders` INSERT succeeds, an orphan order record (no line items) may be left in the database. No rollback mechanism exists at the application layer.

### 4.5 Results — Group 4: Observability (CHAOS-04)

| Test | Fault | Expected | Actual | Status |
|------|-------|---------|--------|--------|
| CHAOS-OBS-01 | Internal DB error — leakage check | Client sees "Internal server error" | ✅ Confirmed | ✅ PASS |
| CHAOS-OBS-02 | Unauthenticated — no stack trace | Clean 401, no stack | ✅ Confirmed | ✅ PASS |

### 4.6 Chaos Summary

| Module | Tests | Passed | Availability | MTTR |
|--------|-------|--------|-------------|------|
| Authentication | 4 | 4 | 100% | 0 ms (stateless) |
| Cart Management | 5 | 5 | 100% | 0 ms (stateless) |
| Order Placement | 5 | 5 | 100% | 0 ms (stateless) |
| Observability | 2 | 2 | N/A | — |
| **Total** | **16** | **16** | **100%** | **0 ms** |

---

## 5. Comparative Analysis: Expected vs Actual

### 5.1 Performance

| Metric | Expected | Actual (Handler) | Projected (Production) | Assessment |
|--------|---------|-----------------|----------------------|------------|
| Auth p95 | < 500 ms | 1.2 ms | ~200–350 ms | ✅ Well within budget |
| Products p95 | < 400 ms | 0.6 ms | ~100–250 ms | ✅ Excellent |
| Cart p95 | < 400 ms | 0.9 ms | ~150–300 ms | ✅ Within budget |
| Error rate (spike) | < 1% | 0.0% | < 0.5% expected | ✅ Exceeds target |
| Latency degradation | ≤ 20% | -24% (improved) | N/A | ✅ No degradation |

### 5.2 Mutation Testing

| Metric | Target | Actual | Assessment |
|--------|--------|--------|------------|
| Overall mutation score | ≥ 70% | **93.8%** | ✅ Exceeds by 23.8 pp |
| lib/auth.ts | ≥ 80% | **100%** | ✅ Perfect |
| lib/errors.ts | ≥ 80% | **100%** | ✅ Perfect |
| api/cart/index.ts | ≥ 80% | **80%** | ✅ Met exactly |
| Surviving mutants | ≤ 3 | **1** | ✅ Excellent |

### 5.3 Chaos Testing vs Midterm Risk Predictions

| Midterm Prediction | Actual Behaviour | Assessment |
|--------------------|----------------|------------|
| Auth failure → unhandled crash | Handled: clean 500 | ✅ Better than predicted |
| DB crash → internal detail leaked | Not leaked: generic 500 | ✅ Better than predicted |
| Cascade failure → system corruption | Stateless recovery in 0 ms | ✅ Better than predicted |
| Empty cart order → undefined behavior | 400 with "Cart is empty" | ✅ Better than predicted |
| Ghost order on cascade failure | Orphan record confirmed | ⚠️ Risk confirmed — no rollback |

### 5.4 Key Discrepancies

| Finding | Root Cause | Severity |
|---------|-----------|----------|
| MUT-CART-05 survived | Tests assert status but not user_id scoping | 🟡 Medium |
| Ghost order risk | No DB transaction / application-level rollback | 🔴 High |
| Cart upsert race condition | SELECT+INSERT pattern is non-atomic | 🟡 Medium |

---

## 6. Metrics Summary

### 6.1 Overall Test Suite (Post-Assignment)

| Metric | Value |
|--------|-------|
| Total test files | **17** |
| Total test cases | **148** |
| Pass rate | **100%** |
| Statement coverage | **90.08%** |
| Branch coverage | **85.58%** |
| Function coverage | **100%** |
| Line coverage | **98.59%** |

### 6.2 Performance Metrics

| Module | VUs | p50 | p95 | p99 | Error Rate |
|--------|-----|-----|-----|-----|------------|
| Auth login | 50 | 0.31 ms | 1.18 ms | 1.54 ms | 0.0% |
| Product catalog | 100 | 0.22 ms | 0.62 ms | 0.89 ms | 0.0% |
| Cart GET | 50 | 0.29 ms | 0.91 ms | 1.10 ms | 0.0% |
| Cart POST (spike 200) | 200 | 0.33 ms | 1.42 ms | 2.01 ms | 0.0% |

### 6.3 Mutation Score

| Module | Created | Killed | Survived | Score |
|--------|---------|--------|----------|-------|
| `lib/auth.ts` | 6 | 6 | 0 | **100%** |
| `lib/errors.ts` | 5 | 5 | 0 | **100%** |
| `api/cart/index.ts` | 5 | 4 | 1 | **80%** |
| **Total** | **16** | **15** | **1** | **93.8%** |

### 6.4 Chaos Testing Availability

| Module | Tests | Passed | Availability | MTTR |
|--------|-------|--------|-------------|------|
| Authentication | 4 | 4 | 100% | 0 ms |
| Cart Management | 5 | 5 | 100% | 0 ms |
| Order Placement | 5 | 5 | 100% | 0 ms |
| **Total** | **16** | **16** | **100%** | **0 ms** |

---

## 7. Lessons Learned & Recommendations

### 7.1 Strengths Identified

1. **Robust error handling boundary** — `handleError()` in `lib/errors.ts` is a consistent security wall. No internal error detail was ever leaked across all 16 chaos scenarios. This is the highest-confidence finding of this assignment.

2. **Stateless architecture = instant recovery** — Vercel serverless functions have zero shared state. CHAOS-ORDER-05 confirmed MTTR = 0 ms — a failed request has zero impact on the next request.

3. **Authentication is well-hardened** — 100% mutation score on `lib/auth.ts`. Every critical branch in token extraction, user verification, and role checking is covered. SQL injection strings were correctly rejected.

4. **Performance headroom is substantial** — p95 handler latency of < 2 ms leaves ~498 ms budget for Supabase network round-trips before crossing the 500 ms SLA.

### 7.2 Weaknesses & Required Actions

**[HIGH] No database transaction on Order creation**
- Ghost orders (orphan records) are possible when `order_items` INSERT fails.
- **Fix:** Wrap cart clear + order create + order_items insert in a Supabase RPC with `BEGIN/COMMIT/ROLLBACK`.

**[MEDIUM] DELETE /cart user_id scoping not asserted in tests**  
- MUT-CART-05 survived because tests checked status, not which user was affected.
- **Fix:** Add `TC-CART-UNIT-07` — assert `eq('user_id', MOCK_USER.id)` is called (code provided in §3.6).

**[MEDIUM] Non-atomic cart upsert (SELECT + INSERT race)**
- Two simultaneous POST /cart requests for the same product can both see `existing = null` and both INSERT.
- **Fix:** Replace with `supabase.from('cart_items').upsert({ user_id, product_id, quantity }, { onConflict: 'user_id,product_id' })`.

**[MEDIUM] No upper-bound validation on quantity**
- `quantity: 999999999` passes validation and is accepted.
- **Fix:** Add `|| quantity > 10000` to the validation guard.

**[LOW] Branch coverage at 85.58%**
- Uncovered branches in order list filters and product POST error path.
- **Fix:** Add targeted tests for order history filtering edge cases.

### 7.3 CI/CD Integration Recommendation

```yaml
# .github/workflows/ci.yml — add alongside existing test step
- name: Run Chaos Tests
  run: npm run test:chaos

- name: Run Performance Simulation  
  run: npm run test:perf

- name: Run Mutation Tests (weekly schedule)
  if: github.event_name == 'schedule'
  run: npm run mutation
```

---

## Appendix A: Delivered Files

```
ecommerce/
├── tests/
│   ├── performance/
│   │   ├── k6-load-test.js              # k6 production load test (4 scenarios)
│   │   └── perf-simulation.test.ts      # Vitest concurrent simulation (reference)
│   ├── mutation/
│   │   ├── mutation-runner.mjs          # Automated mutation runner
│   │   └── results/
│   │       └── mutation-report.json     # Machine-readable mutation results
│   └── chaos/
│       └── chaos.test.ts                # Reference chaos test suite
├── apps/server/__tests__/
│   ├── performance/
│   │   └── perf-simulation.test.ts      # Runs via npm test
│   ├── chaos/
│   │   └── chaos.test.ts                # Runs via npm test
│   └── integration/
│       └── cart-order-edge.test.ts      # (existing, pulled from git)
└── package.json                         # npm run mutation / test:perf / test:chaos
```

## Appendix B: Test ID Reference

| Test ID | Category | Module | Result |
|---------|----------|--------|--------|
| PERF-AUTH-01 | Performance | Auth | ✅ p95=1.18ms |
| PERF-AUTH-02 | Performance | Auth | ✅ No degradation |
| PERF-PROD-01 | Performance | Products | ✅ p95=0.62ms |
| PERF-PROD-02 | Performance | Products | ✅ p95=0.49ms |
| PERF-CART-01 | Performance | Cart | ✅ p95=0.91ms |
| PERF-CART-02 | Performance | Cart | ✅ 0% errors at 200 VUs |
| MUT-AUTH-01–06 | Mutation | lib/auth.ts | ✅ All Killed (100%) |
| MUT-ERR-01–05 | Mutation | lib/errors.ts | ✅ All Killed (100%) |
| MUT-CART-01–04 | Mutation | api/cart/index.ts | ✅ Killed |
| MUT-CART-05 | Mutation | api/cart/index.ts | ⚠️ Survived — gap identified |
| CHAOS-AUTH-01–04 | Chaos | Auth | ✅ All Pass |
| CHAOS-CART-01–05 | Chaos | Cart | ✅ All Pass |
| CHAOS-ORDER-01–05 | Chaos | Orders | ✅ All Pass |
| CHAOS-OBS-01–02 | Chaos | All | ✅ No leakage confirmed |
