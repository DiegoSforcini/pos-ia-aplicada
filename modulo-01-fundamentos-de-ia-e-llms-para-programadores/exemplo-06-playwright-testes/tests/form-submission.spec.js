import { test, expect } from '@playwright/test';

test.describe('Form Submission Tests', () => {
  test('should submit form and update the image gallery', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });

    // Get initial state
    const initialImages = await page.locator('img').count();
    const initialTitles = await page.locator('body').textContent();

    // Fill form with valid data
    const titleInput = page.locator('input[placeholder="Image Title"]');
    const urlInput = page.locator('input[placeholder*="img.com"]');
    const submitButton = page.locator('input[type="submit"]');

    await titleInput.fill('Test Alien Image');
    await urlInput.fill('https://example.com/test-alien.jpg');

    // Submit form
    await submitButton.click();

    // Wait for page update
    await page.waitForTimeout(1000);

    // Verify list was updated
    const finalImages = await page.locator('img').count();
    expect(finalImages).toBe(initialImages + 1);

    // Verify new title appears in the page
    await expect(page.locator('body')).toContainText('Test Alien Image');

    // Verify new image has correct alt text
    const newImage = page.locator('img[alt="Image of an Test Alien Image"]');
    await expect(newImage).toBeVisible();
  });

  test('should allow multiple form submissions', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });

    const initialImages = await page.locator('img').count();

    // Submit first image
    const titleInput = page.locator('input[placeholder="Image Title"]');
    const urlInput = page.locator('input[placeholder*="img.com"]');
    const submitButton = page.locator('input[type="submit"]');

    await titleInput.fill('First Test Image');
    await urlInput.fill('https://example.com/first.jpg');
    await submitButton.click();
    await page.waitForTimeout(500);

    // Submit second image
    await titleInput.fill('Second Test Image');
    await urlInput.fill('https://example.com/second.jpg');
    await submitButton.click();
    await page.waitForTimeout(500);

    // Verify both images were added
    const finalImages = await page.locator('img').count();
    expect(finalImages).toBe(initialImages + 2);

    // Verify both titles appear
    await expect(page.locator('body')).toContainText('First Test Image');
    await expect(page.locator('body')).toContainText('Second Test Image');
  });
});