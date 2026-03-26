# Assignment 1 Report: Risk Assessment & Test Strategy

**Student:** [Your Name]  
**Subject:** Quality Assurance  
**Project:** Ecommerce QA Platform (React & Supabase)

---

## 1. System Overview

The project is a modern E-commerce web application built on a microservices/serverless architecture:

*   **Frontend:** React (Vite) using Feature-Sliced Design (FSD). Core modules include `auth`, `cart`, and `catalog`. State is managed via `Zustand`, and styling is handled with `Tailwind CSS`.
*   **Backend:** Node.js Vercel Serverless Functions integrated with **Supabase** (PostgreSQL + Auth + Storage).
*   **Infrastructure:** A monorepo structure (Apps & Packages) deployed on Vercel.

---

## 2. Risk Assessment

Based on the architectural analysis, key modules were identified and assessed using the **Probability × Impact** risk matrix.

| Component / Module | Risk Description | Impact (1-5) | Prob. (1-5) | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | Data leakage, unauthorized access to user profiles. | 5 (Critical) | 2 (Low) | **High** |
| **Cart & Checkout** | Pricing calculation errors, order duplication, payment failures. | 5 (Critical) | 4 (High) | **Critical** |
| **Catalog / Search** | Incorrect price display or missing items in search results. | 3 (Medium) | 3 (Medium) | **Medium** |
| **Database Sync** | Stock level desynchronization between Supabase and the client. | 4 (High) | 3 (Medium) | **High** |

### Prioritization Rationale:
*   **Checkout** is the highest priority because any failure here directly results in lost revenue and diminished user trust.
*   **Auth** is critical for security, though the risk of failure is mitigated by using Supabase's managed Auth solution.

---

## 3. QA Environment Setup

The following tools have been selected to ensure system quality (aligned with assignment requirements):

1.  **Playwright:** E2E testing. Configured in `playwright.config.ts`. Tests located in `e2e/`.
2.  **Vitest:** Unit/Integration testing. Configured in `vitest.config.ts`.
3.  **Postman / Bruno:** API testing.
4.  **GitHub Actions:** CI/CD integration. Configured in `.github/workflows/ci.yml`.

### Setup Details (Actual):
- **Dependencies installed:** `@playwright/test`, `vitest`, `@testing-library/react`, `jsdom`.
- **Scripts added to `apps/client/package.json`:**
  - `npm run test:unit` - Runs Vitest.
  - `npm run test:e2e` - Runs Playwright E2E tests.
- **Monorepo Scripts (Root `package.json`):**
  - `npm run lint` - Lints all workspaces.
  - `npm run test` - Runs unit tests across all workspaces.
  - `npm run test:e2e` - Runs E2E tests across all workspaces.

### CI/CD Pipeline Configuration:
The project uses GitHub Actions for automated quality gates. The workflow (`ci.yml`) performs:
1.  **Installation:** Fresh dependency install.
2.  **Linting:** Static code analysis for all apps and packages.
3.  **Typechecking:** Verifying TypeScript integrity.
4.  **Unit Testing:** Executing Vitest suites.
5.  **E2E Testing:** Running Playwright tests after installing necessary browser binaries.

### Project Structure (Testing & CI):
```text
.github/workflows/
└── ci.yml                 # CI/CD Pipeline definition
apps/client/
├── e2e/                   # E2E Tests
├── src/__tests__/         # Unit/Integration Tests
├── playwright.config.ts   # Playwright config
└── vitest.config.ts       # Vitest config
package.json               # Root scripts for monorepo
```

> [!IMPORTANT]
> **Screenshot Placeholder #1: Tools Setup Evidence**
> *Action: Run `npm run test:unit` and `npm run test:e2e` in the `apps/client` folder and take a screenshot of the pass results.*
> 
> ![Placeholder: Test Results Evidence]()

---

## 4. Initial Test Strategy

### Objectives:
*   Achieve 80% Unit test coverage for core business logic (found in `shared/utils` and `features/cart/model`).
*   Automate 100% of the "Happy Path" scenarios for the checkout process.

### Approach:
*   **Automated:** 70% (Regression, API, Unit).
*   **Manual:** 30% (UI/UX, cross-browser testing, exploratory testing for new features).

### Baseline Metrics for Research Paper:
*   **Count of High-risk Modules:** 2 (Auth, Cart/Checkout).
*   **Planned Coverage:** 75% of code.
*   **Estimated Effort:** ~15-20 hours for initial automation setup.

---

## 5. Deliverables & Evidence (Screenshots)

### 5.1 System Analysis
> [!NOTE]
> **Screenshot Placeholder #2:** App interface or source code tree view.
> 
> ![Placeholder: System View]()

### 5.2 Tool Configuration
> [!TIP]
> **Screenshot Placeholder #3:** Terminal window showing successfully installed dependencies (`npm install playwright`).
> 
> ![Placeholder: Installation Result]()

### 5.3 CI/CD Pipeline
> [!WARNING]
> **Screenshot Placeholder #4:** GitHub Actions status page showing the first successful linting/test run.
> 
> ![Placeholder: CI/CD Pipeline]()

---

## Summary
The project is ready for the active testing phase. The primary focus will be on stabilizing the Checkout process and ensuring user data security through robust Supabase integration.
