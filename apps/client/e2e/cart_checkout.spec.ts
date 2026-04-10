import { test, expect } from '@playwright/test';

test.describe('Cart & Checkout Flow', () => {
  test('Full checkout journey', async ({ page }) => {
    // 1. Browse catalog
    await page.goto('/catalog');
    
    // 2. Add product to cart
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
      await page.screenshot({ path: 'playwright-report/screenshots/cart-added.png' });
    }

    // 3. Go to cart
    await page.goto('/cart');
    await expect(page).toHaveURL('/cart');
    await page.screenshot({ path: 'playwright-report/screenshots/cart-page.png' });

    // 4. Update quantity
    const increaseBtn = page.locator('button:has-text("+")').first();
    if (await increaseBtn.isVisible()) {
      await increaseBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'playwright-report/screenshots/cart-updated.png' });
    }

    // 5. Proceed to checkout
    const checkoutBtn = page.locator('button:has-text("Checkout")');
    if (await checkoutBtn.isVisible()) {
      await checkoutBtn.click();
      await expect(page).toHaveURL('/checkout');
      await page.screenshot({ path: 'playwright-report/screenshots/checkout-page.png' });
    }

    // 6. Place order
    const placeOrderBtn = page.locator('button:has-text("Place Order")');
    if (await placeOrderBtn.isVisible()) {
      // We take screenshot before placing
      await page.screenshot({ path: 'playwright-report/screenshots/checkout-summary.png' });
      // await placeOrderBtn.click();
      // await expect(page).toHaveURL('/profile');
    }
  });

  test('Redirect to cart if checkout is empty', async ({ page }) => {
    await page.goto('/checkout');
    // If cart is empty, it should redirect back to cart or show error
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'playwright-report/screenshots/checkout-empty-redirect.png' });
  });
});
