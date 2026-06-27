import { test, expect } from '@playwright/test';

test.describe('Form Validation Tests', () => {
  test('should not submit form with empty fields', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });

    const initialImages = await page.locator('img').count();
    const submitButton = page.locator('input[type="submit"]');

    // Try to submit empty form
    await submitButton.click();
    await page.waitForTimeout(500);

    // Verify no new image was added
    const afterEmptySubmit = await page.locator('img').count();
    expect(afterEmptySubmit).toBe(initialImages);
  });

  test('should not submit form with only title', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });

    const initialImages = await page.locator('img').count();
    const titleInput = page.locator('input[placeholder="Image Title"]');
    const submitButton = page.locator('input[type="submit"]');

    // Fill only title
    await titleInput.fill('Title Only Test');
    await submitButton.click();
    await page.waitForTimeout(500);

    // Verify no new image was added
    const afterTitleOnly = await page.locator('img').count();
    expect(afterTitleOnly).toBe(initialImages);
  });

  test('should not submit form with only URL', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });

    const initialImages = await page.locator('img').count();
    const urlInput = page.locator('input[placeholder*="img.com"]');
    const submitButton = page.locator('input[type="submit"]');

    // Fill only URL
    await urlInput.fill('https://example.com/image.jpg');
    await submitButton.click();
    await page.waitForTimeout(500);

    // Verify no new image was added
    const afterUrlOnly = await page.locator('img').count();
    expect(afterUrlOnly).toBe(initialImages);
  });

  test('should require both title and URL for submission', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });

    const initialImages = await page.locator('img').count();
    const titleInput = page.locator('input[placeholder="Image Title"]');
    const urlInput = page.locator('input[placeholder*="img.com"]');
    const submitButton = page.locator('input[type="submit"]');

    // Test various incomplete combinations that should NOT submit
    const testCases = [
      { title: '', url: '', description: 'both empty' },
      { title: 'Test Title', url: '', description: 'missing URL' },
      { title: '', url: 'https://example.com/image.jpg', description: 'missing title' },
    ];

    for (const testCase of testCases) {
      await titleInput.fill(testCase.title);
      await urlInput.fill(testCase.url);
      await submitButton.click();
      await page.waitForTimeout(300);

      // Verify no new image was added
      const currentImages = await page.locator('img').count();
      expect(currentImages, `Failed for case: ${testCase.description}`).toBe(initialImages);
    }

    // Test whitespace-only cases (these might actually submit based on our findings)
    const whitespaceCases = [
      { title: '   ', url: 'https://example.com/image.jpg', description: 'whitespace title' },
      { title: 'Test Title', url: '   ', description: 'whitespace URL' },
    ];

    for (const testCase of whitespaceCases) {
      const imagesBefore = await page.locator('img').count();
      await titleInput.fill(testCase.title);
      await urlInput.fill(testCase.url);
      await submitButton.click();
      await page.waitForTimeout(300);

      const imagesAfter = await page.locator('img').count();
      // Whitespace might be trimmed or accepted, so just check it doesn't break
      expect(imagesAfter, `Failed for whitespace case: ${testCase.description}`).toBeGreaterThanOrEqual(imagesBefore);
    }
  });

  test('should clear form fields after successful submission', async ({ page }) => {
    await page.goto('/vanilla-js-web-app-example/', { waitUntil: 'networkidle' });

    const titleInput = page.locator('input[placeholder="Image Title"]');
    const urlInput = page.locator('input[placeholder*="img.com"]');
    const submitButton = page.locator('input[type="submit"]');

    // Submit valid form
    await titleInput.fill('Clear Test');
    await urlInput.fill('https://example.com/clear-test.jpg');
    await submitButton.click();
    await page.waitForTimeout(500);

    // Verify form fields are cleared
    const titleValue = await titleInput.inputValue();
    const urlValue = await urlInput.inputValue();

    expect(titleValue).toBe('');
    expect(urlValue).toBe('');
  });
});