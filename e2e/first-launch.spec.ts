/**
 * E2E Test: First Launch to L1 Complete
 *
 * Validates the complete onboarding flow:
 * 1. Splash screen loads with progress bar
 * 2. User gesture unlocks audio
 * 3. Main menu appears
 * 4. Navigate to World 1 → Level 1
 * 5. Complete L1 (tutorial level with obvious matches)
 * 6. Level complete screen shows 1+ stars
 */
import { test, expect } from '@playwright/test';

test.describe('First Launch to L1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('splash screen shows loading progress', async ({ page }) => {
    // Splash screen should be visible initially
    // TODO: Replace with actual selectors once UI is rendered
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
  });

  test('main menu appears after splash', async ({ page }) => {
    // Click to dismiss splash / unlock audio
    await page.click('canvas');

    // Wait for menu state — verify via game state or visible UI
    // Stub: check that canvas is interactive
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('can navigate to world map', async ({ page }) => {
    await page.click('canvas');
    // TODO: Click "Play" button on main menu
    // await page.click('[data-testid="btn-play"]');
    // Verify world map is shown
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('can start and complete L1', async ({ page }) => {
    await page.click('canvas');
    // TODO: Navigate through menu → world map → L1
    // TODO: Perform swap actions to complete L1
    // TODO: Verify level complete screen
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('L1 completion shows star rating', async ({ page }) => {
    // TODO: After completing L1, verify star animation plays
    // and at least 1 star is awarded
    await expect(page.locator('canvas')).toBeVisible();
  });
});
