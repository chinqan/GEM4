/**
 * E2E Test: Cross-Browser Compatibility
 *
 * Validates the game works correctly across:
 * - Chrome (Chromium)
 * - Firefox
 * - Safari (WebKit)
 * - Edge (Chromium-based)
 *
 * These tests run the same core scenarios across all browsers
 * configured in playwright.config.ts.
 */
import { test, expect } from '@playwright/test';

test.describe('Cross-Browser Compatibility', () => {
  test('canvas renders and is interactive', async ({ page, browserName }) => {
    await page.goto('/');

    // Canvas should be present and visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Canvas should have non-zero dimensions
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    // Log browser info for debugging
    console.log(`Browser: ${browserName}, Canvas: ${box!.width}x${box!.height}`);
  });

  test('click interaction works', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Click should not throw
    await canvas.click();

    // Page should still be responsive
    await expect(canvas).toBeVisible();
  });

  test('keyboard input works', async ({ page }) => {
    await page.goto('/');
    await page.click('canvas');

    // ESC key should be handled without errors
    await page.keyboard.press('Escape');
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('localStorage is accessible', async ({ page }) => {
    await page.goto('/');

    const hasLocalStorage = await page.evaluate(() => {
      try {
        localStorage.setItem('__test__', '1');
        localStorage.removeItem('__test__');
        return true;
      } catch {
        return false;
      }
    });

    expect(hasLocalStorage).toBe(true);
  });

  test('no console errors on startup', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Filter out known non-critical errors (e.g., missing audio files)
    const criticalErrors = errors.filter(
      (e) => !e.includes('audio') && !e.includes('404') && !e.includes('net::ERR'),
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
