import { test, expect } from '@playwright/test';

test('homepage has title and catalog link', async ({ page }) => {
    // Mock API requests
    await page.route('**/api/products*', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [], total: 0 }),
        });
    });
    await page.route('**/api/categories', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] }),
        });
    });

    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/E-commerce/i);

    // Check for catalog link in the navigation menu
    const catalogLink = page.getByRole('navigation').getByRole('link', { name: 'Catalog', exact: true });
    await expect(catalogLink).toBeVisible();
    await catalogLink.click();
    await expect(page).toHaveURL(/.*catalog/);
});
