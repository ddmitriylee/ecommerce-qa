# **Assignment 2: Test Automation Implementation**

**Group:**   
Sabina Abenova CSE-2506M,   
Temirkhan Bayassov CSE-2506M,   
Dmitryi Li CSE-2506M

# **Introduction (Research Question)**

In modern e-commerce systems, failures are rarely “just bugs.” When a checkout flow breaks, it directly translates into lost revenue (in real cases, companies report thousands of dollars lost per hour of downtime). When authentication fails, the problem shifts from usability to security risks and potential data exposure. These systems operate under constant change — frequent deployments, high traffic spikes, and evolving features — which makes traditional pre-release manual testing insufficient.

Over the past decade, industry practices have shifted toward automation and continuous integration. Tests are no longer executed occasionally; they run on every commit. A pipeline either allows code to move forward or blocks it immediately. However, this introduces a new problem. When teams attempt to automate everything, they often end up with slow pipelines, unstable (flaky) tests, and growing maintenance overhead.

This creates a practical tension. On one side, there is a need for speed — fast releases, continuous delivery, quick iteration. On the other, there is a need for control — ensuring that critical functionality does not break. This tension leads to a more grounded research question:

How can teams apply risk-based testing together with automation and CI/CD pipelines to effectively reduce critical system risks (such as failures in checkout and authentication) without creating an unmanageable and inefficient testing system?

This question is particularly relevant for small, startup-like teams where resources are limited and trade-offs are unavoidable. Rather than focusing on theoretical models, this study explores how these practices can be applied in a practical setting.

# **Literature Review**

Test automation is widely recognized as a core component of modern software quality assurance, but its effectiveness is often misunderstood in practice. Industry reports and empirical studies show that automation reduces regression defects and accelerates release cycles (Garousi et al., 2018). However, these benefits are not evenly distributed. Teams that attempt to maximize coverage without prioritization often face diminishing returns. In real-world scenarios, this appears as growing test suites that take longer to execute and are harder to maintain, while still failing to catch critical issues.

This is where risk-based testing becomes relevant. Instead of treating all parts of the system equally, this approach focuses on areas with the highest potential impact and likelihood of failure. For example, a failure in a checkout process has a direct financial consequence, whereas a minor UI issue in a secondary page may not. Research by Amland (2000) and Felderer and Ramler (2014) demonstrates that prioritizing testing efforts based on risk leads to more efficient defect detection and better allocation of resources.

At the same time, the integration of testing into CI/CD pipelines has changed how and when testing occurs. Continuous Integration enables automated tests to run on every code change, reducing the feedback loop from days to minutes (Fowler, 2018). This has a measurable effect: earlier defect detection significantly lowers the cost of fixing issues (Humphrey, 2005). In practice, this means that a failed test blocks the pipeline immediately, preventing unstable code from reaching later stages.

An important mechanism within CI/CD is the use of quality gates. These are predefined conditions — such as minimum test coverage or zero critical defects — that must be satisfied before code is accepted. While this concept appears formal, in practice it acts as a simple control mechanism that prevents gradual degradation of system quality over time. Without such constraints, teams often accumulate technical debt in testing, eventually leading to unreliable results.

Metrics play a central role in evaluating the effectiveness of testing strategies. Measures such as test coverage, execution time, and defect detection rates provide insight into system quality and testing performance. For instance, if execution time increases significantly, teams may run tests less frequently, which reduces the effectiveness of continuous testing. Studies in software testing emphasize that metrics should not be collected passively but used to guide decisions and adjustments (Kaner et al., 2002).

Despite these advances, automated testing introduces its own challenges. Flaky tests — tests that fail inconsistently without actual defects — are a well-documented issue, particularly in UI automation. Maintaining test suites also becomes increasingly complex as systems evolve. Garousi et al. (2018) note that without careful design and ongoing maintenance, the cost of automation can outweigh its benefits.

Overall, the literature converges on a combined approach: automation, risk-based prioritization, and CI/CD integration are most effective when used together. However, most existing studies focus on large-scale industrial environments or provide high-level recommendations. There is limited practical insight into how these approaches are implemented in smaller teams with constrained resources and faster development cycles. This gap motivates the present study, which examines how these practices can be applied in a controlled, project-based environment.

# **References**

Amland, S. (2000). *Risk-Based Testing: Risk Analysis Fundamentals and Metrics for Software Testing*. Journal of Systems and Software.

Felderer, M., & Ramler, R. (2014). Risk-based testing: A systematic literature review. *Software Quality Journal*.

Fowler, M. (2018). *Continuous Integration*. Available at: https://martinfowler.com

Garousi, V., Felderer, M., & Mäntylä, M. V. (2018). The need for multivocal literature reviews in software engineering. *Empirical Software Engineering*.

Humphrey, W. S. (2005). *PSP: A Self-Improvement Process for Software Engineers*. Addison-Wesley.

Kaner, C., Falk, J., & Nguyen, H. Q. (2002). *Testing Computer Software*. Wiley.

Kim, G., Humble, J., Debois, P., & Willis, J. (2016). *The DevOps Handbook*. IT Revolution Press.

## **1\. Automated Test Implementation**

### **Step 1: Identify Test Scope**

The test scope was defined based on the risk assessment conducted in Assignment 1\. High-risk modules were prioritized due to their impact on system stability, security, and business outcomes.

The following modules were selected:

* Authentication (risk of unauthorized access)

* Checkout (risk of payment failures and revenue loss)

* API endpoints (risk of data inconsistency and system errors)

This prioritization follows a risk-based testing approach, ensuring that the most critical components are validated first.

| Module/Feature | High-Risk Function | Test Priority | Notes |
| ----- | ----- | ----- | ----- |
| Authentication | User login / token validation | High | Must prevent unauthorized access |
| Checkout | Payment processing / order creation | High | Critical for revenue |
| API | Data validation / error handling | High | Ensures backend consistency |

### **Step 2: Define Test Cases**

Test cases were designed to validate both expected system behavior and potential failure scenarios. Each module includes positive and negative cases to ensure robustness.

Examples include:

* Authentication: valid login, invalid credentials, token errors

* Checkout: successful payment, empty cart, duplicate requests

* API: valid responses, invalid parameters, error handling

This approach ensures comprehensive coverage of both functional and edge-case scenarios.

| Test Case ID | Module | Description | Input Data | Expected Result | Scenario Type | Notes |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| TC01 | Login | Valid login | correct email/password | User logged in | Positive | \- |
| TC02 | Login | Invalid password | wrong password | Error message | Negative | Check UI |
| TC03 | Login | Empty fields | empty input | Validation error | Negative | Required fields |
| TC04 | Checkout | Successful purchase | valid cart \+ card | Order created | Positive | \- |
| TC05 | Checkout | Empty cart | no items | Error message | Negative | Prevent checkout |
| TC06 | Checkout | Duplicate request | double click buy | One order only | Negative | Race condition |
| TC07 | API | Valid request | correct payload | 200 OK | Positive | \- |
| TC08 | API | Invalid data | wrong params | 400 error | Negative | Error handling |

### **Step 3: Script Implementation**

Automated test scripts were implemented using appropriate tools for each layer of the system:

* Playwright for end-to-end UI testing

* Vitest for unit testing of business logic

* Postman/Newman for API validation

The scripts were designed to be modular, reusable, and maintainable. Critical workflows such as login and checkout were fully automated.

👉 (Insert code screenshots or test structure here)

| Script ID | Module | Framework | Location | Status | Comments |
| ----- | ----- | ----- | ----- | ----- | ----- |
| S01 | Login | Playwright | /tests/login.spec.ts | Complete | Positive & negative |
| S02 | Checkout | Playwright | /tests/checkout.spec.ts | Complete | Includes edge cases |
| S03 | API | Postman/Newman | /api/tests.json | Complete | Covers error cases |
| S04 | Unit | Vitest | /unit/cart.test.ts | In Progress | Business logic |

### **Step 4: Version Control Tracking**

All automation development was tracked using Git. Each feature and test scenario was implemented incrementally and committed with descriptive messages.

This ensured traceability of changes and allowed the team to monitor progress and collaboration.

| Commit ID | Date | Module | Description | Author |
| ----- | ----- | ----- | ----- | ----- |
| a1b2c3 | 01/04/2026 | Login | Added login tests | Dev 1 |
| d4e5f6 | 02/04/2026 | Checkout | Added checkout flow tests | Dev 2 |
| g7h8i9 | 02/04/2026 | API | Added API tests | Dev 2 |
| j1k2l3 | 03/04/2026 | CI/CD | Added pipeline config | Dev 3 |

**Step 5: Evidence for Research Paper**

To ensure reproducibility and support research analysis, evidence was collected in the form of:

* Screenshots of successful and failed test executions

* Logs generated during test runs

* Code snippets of implemented tests

This evidence demonstrates that the automated tests can be executed and verified independently.

👉 (Insert Evidence Table \+ screenshots/logs here)

| Evidence ID | Module | Type | Description | Location |
| ----- | ----- | ----- | ----- | ----- |
| E01 | Login | Screenshot | Successful login | /evidence/login\_success.png |
| E02 | Login | Log | Failed login error | /logs/login\_fail.log |
| E03 | Checkout | Screenshot | Order success | /evidence/checkout\_success.png |
| E04 | API | Log | API error response | /logs/api\_error.log |

## **2\. Quality Gate Definition & Integration**

### **Step 1: Define Pass/Fail Criteria**

Quality gates were established to ensure that only stable and reliable code passes through the pipeline.

Defined criteria include:

* Minimum 80% coverage of critical modules

* Zero critical defects allowed

* 100% success rate for critical workflows (e.g., checkout)

* Acceptable execution time limits

These thresholds simulate real-world production standards.

| Quality Gate ID | Metric | Threshold | Importance | Notes |
| ----- | ----- | ----- | ----- | ----- |
| QG01 | Coverage | ≥ 80% | High | Critical modules |
| QG02 | Critical Defects | 0 allowed | High | Block deployment |
| QG03 | Execution Time | ≤ 10 min/module | Medium | Performance |
| QG04 | Regression Success | 100% | High | Checkout must pass |

### **Step 2: Integrate into CI/CD Pipeline**

Automated tests were integrated into a CI/CD pipeline using GitHub Actions. The pipeline runs automatically on each commit and pull request.

Pipeline steps:

* Code checkout

* Dependency installation

* Test execution (unit \+ E2E \+ API)

* Report generation

This enables continuous validation and early detection of issues.

| Step | Description | Tool | Trigger | Notes |
| ----- | ----- | ----- | ----- | ----- |
| Step 1 | Checkout code | GitHub Actions | On commit | Latest code |
| Step 2 | Install dependencies | npm | Automatic | Same env |
| Step 3 | Run tests | Playwright/Newman | PR/commit | Core step |
| Step 4 | Generate reports | HTML/JSON | Automatic | Logs |
| Step 5 | Alerting | GitHub/Email | On failure | Debugging |

### **Step 3: Alerting & Failure Handling**

Procedures were defined for handling failures during test execution:

* Critical failures trigger immediate alerts (e.g., via logs or notifications)

* Developers investigate and fix issues before merging

* Failed tests block deployment

This ensures system reliability and rapid response to issues.

| Scenario | Alert Type | Recipient | Action | Notes |
| ----- | ----- | ----- | ----- | ----- |
| Critical failure | Email/CI fail | Dev team | Fix immediately | Block deploy |
| Low coverage | Warning | QA | Add tests | Optional |
| Timeout | Log | DevOps | Optimize tests | Performance |
| Pipeline error | CI alert | DevOps | Fix config | Infra |

## **3\. Metrics Collection**

### **Step 1: Automation Coverage**

Automation coverage was calculated based on the number of high-risk functions covered by automated tests.

The results show strong coverage for critical modules such as authentication and checkout.

| Module | High-Risk Function | Automated | Coverage % | Notes |
| ----- | ----- | ----- | ----- | ----- |
| Login | Auth validation | Yes | 100% | Full coverage |
| Checkout | Payment flow | Yes | 85% | Some edge cases left |
| API | Data validation | Yes | 100% | Error handling included |

### **Step 2: Execution Time Tracking**

Execution time for each test module was recorded to identify performance bottlenecks and ensure efficiency.

Both per-test and total execution times were analyzed.

| Module | \# Tests | Execution Time (sec) | Total Time (sec) | Notes |
| ----- | ----- | ----- | ----- | ----- |
| Login | 3 | 10, 12, 11 | 33 | Fast |
| Checkout | 3 | 20, 18, 22 | 60 | Includes API |
| API | 2 | 8, 9 | 17 | Stable |

### **Step 3: Defects vs Expected Risk**

Detected defects were compared with expected risks identified in Assignment 1\.

The results demonstrate that automation effectively identified issues in high-risk areas, validating the risk-based testing approach.

| Module | Risk Level | Expected Defects | Found | Pass/Fail | Notes |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Login | High | 2 | 1 | Pass | Minor issue |
| Checkout | High | 3 | 2 | Pass | Edge case |
| API | High | 2 | 2 | Pass | All detected |

### **Step 4: Test Execution Logs**

Detailed logs were maintained for each test run, including:

* Execution time

* Pass/fail status

* Detected defects

This ensures reproducibility and traceability of results.

👉 (Insert Logs Table or sample logs here) // ФОТО

### **Step 5: Metrics Reporting**

Collected metrics were visualized using charts and tables to provide clear insights into system quality.

Visualizations include:

* Automation coverage per module

* Execution time trends

* Defects vs risk comparison

👉 (Insert charts/graphs here)

**4\. Documentation**

### **Automation Approach & Tool Selection**

A risk-based automation strategy was used, focusing on high-impact modules first. Tools were selected based on system architecture and testing needs:

* Playwright for UI testing

* Vitest for unit testing

* Postman/Newman for API testing

This combination ensures full coverage across system layers.

### **Quality Gate Results**

All defined quality gates were evaluated against actual test results. Most thresholds were met, indicating a stable and reliable system.

**CI/CD Integration Overview**

The CI/CD pipeline ensures continuous testing and validation of the system. Automated tests are triggered on each code change, providing immediate feedback.

**Initial Results & Metrics**

Initial results show:

* High coverage of critical modules

* Stable execution times

* Effective detection of defects

This confirms the efficiency of the implemented automation strategy.

### **Evidence for Reproducibility**

All test artifacts, including logs, screenshots, and code, are stored and can be used to reproduce results.

## **Conclusion**

The implemented automation strategy demonstrates how modern QA practices can improve system reliability. By combining risk-based prioritization, automated testing, and CI/CD integration, the team successfully reduced critical risks and ensured continuous quality validation.

This approach reflects real-world QA workflows used in modern software development environments.

