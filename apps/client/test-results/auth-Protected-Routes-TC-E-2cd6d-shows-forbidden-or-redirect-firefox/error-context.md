# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Protected Routes >> TC-E2E-AUTH-08: accessing /admin without admin role shows forbidden or redirect
- Location: e2e/auth.spec.ts:115:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /Users/dmitrijli/Library/Caches/ms-playwright/firefox-1511/firefox/Nightly.app/Contents/MacOS/firefox
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```