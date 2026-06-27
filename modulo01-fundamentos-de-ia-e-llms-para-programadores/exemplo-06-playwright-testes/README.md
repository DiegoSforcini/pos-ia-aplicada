# Playwright Testing Setup

This directory contains end-to-end tests for the [Vanilla JS Web App](https://erickwendel.github.io/vanilla-js-web-app-example/) using Playwright.

## Prerequisites

- Node.js 18+ installed
- npm or yarn

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Chromium Browser

```bash
npx playwright install --with-deps chromium
```

## Running Tests Locally

```bash
# Run all tests
npm test

# Run tests in debug mode
npm run test:debug

# Run tests with UI mode (interactive)
npm run test:ui

# Run tests with browser visible (headed mode)
npm run test:headed
```

## Test Files

- `tests/example.spec.js` - Basic smoke tests for the vanilla JS web app
- `tests/form-submission.spec.js` - Tests for form submission and gallery updates
- `tests/form-validation.spec.js` - Tests for form validation and edge cases

## Test Coverage

### Basic Functionality (example.spec.js)
- App loads successfully with correct title
- Form has 3 input fields
- Gallery displays 3 images
- All images have meaningful alt text
- All image titles are visible on page

### Form Submission (form-submission.spec.js)
- Submitting valid form adds new image to gallery
- New image appears with correct title and alt text
- Multiple submissions work correctly
- Gallery updates dynamically

### Form Validation (form-validation.spec.js)
- Empty form submission is rejected
- Missing title or URL prevents submission
- Form fields are cleared after successful submission
- Whitespace-only inputs are handled appropriately

## Configuration

- **Base URL**: `https://erickwendel.github.io/vanilla-js-web-app-example`
- **Test Timeout**: 5 seconds per test
- **Browser**: Chromium only
- **Report**: HTML report generated in `playwright-report/`

## CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/playwright.yml`) that:

- Runs on push to main/master/develop branches
- Runs on pull requests to these branches
- Installs only Chromium (minimal dependencies)
- Generates HTML reports on test failure
- Uploads reports as artifacts for 30 days

### Manual CI Trigger

```bash
# Set CI environment variable to simulate CI mode
CI=true npm test
```

## View Test Report

After running tests, open the HTML report:

```bash
npx playwright show-report
```

## Extending Tests

To add more tests, create new `.spec.js` files in the `tests/` directory following the Playwright test structure:

```javascript
import { test, expect } from '@playwright/test';

test('your test name', async ({ page }) => {
  await page.goto('/index.html');
  // Add assertions here
  expect(true).toBeTruthy();
});
```

## Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test Runner](https://playwright.dev/docs/intro)
- [Assertions](https://playwright.dev/docs/test-assertions)
