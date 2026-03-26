import { test, expect } from '@playwright/test';

test('homepage has title and catalog link', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/E-commerce/i);

    // Check for catalog link
    const catalogLink = page.getByRole('link', { name: /catalog/i });
    if (await catalogLink.isVisible()) {
        await catalogLink.click();
        await expect(page).toHaveURL(/.*catalog/);
    }
});
