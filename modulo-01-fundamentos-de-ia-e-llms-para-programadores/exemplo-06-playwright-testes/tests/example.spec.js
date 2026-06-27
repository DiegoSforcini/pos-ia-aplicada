import { test, expect } from '@playwright/test';

test.describe('Vanilla JS Web App', () => {
  test('should load the app successfully', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });
    
    // Verify page title
    const title = await page.title();
    expect(title).toBe('TDD Frontend Example');
  });

  test('should have form with image inputs', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });
    
    // Check all inputs exist and are visible
    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBe(3); // title input, url input, submit button
  });

  test('should display three images', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });
    
    // Check for all images
    const images = page.locator('img');
    const count = await images.count();
    expect(count).toBe(3);
  });

  test('should have correct image alt texts', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });
    
    // Check for images with alt text
    const images = page.locator('img[alt]');
    const count = await images.count();
    expect(count).toBe(3);
    
    // Verify images have meaningful alt text
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt).toContain('Image');
    }
  });

  test('should display correct image titles', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Additional wait for content to fully render
    
    // Look for title text in the page
    await expect(page.locator('body')).toContainText('AI Alien');
    await expect(page.locator('body')).toContainText('Predator Night Vision');
    await expect(page.locator('body')).toContainText('ET Bilu');
  });
});
