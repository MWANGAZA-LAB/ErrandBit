# ErrandBit E2E Tests

Comprehensive end-to-end tests using Playwright for the ErrandBit platform.

## Test Suites

### 1. **auth.spec.ts** - Authentication Tests
- User login with validation
- Logout functionality
- Protected route access
- Session persistence
- Invalid credential handling

### 2. **jobs.spec.ts** - Job Management Tests
- Create new jobs
- Browse available jobs
- View job details
- My jobs list
- Job status updates
- Job cancellation
- Search and filtering

### 3. **runner.spec.ts** - Runner Profile Tests
- Create runner profile
- View runner details
- Find/search runners
- Runner assignment to jobs
- Earnings dashboard
- Payout history

### 4. **profile.spec.ts** - Profile Management Tests
- View and edit profile
- Update Lightning address
- Change password
- Update preferences (theme, notifications)
- Security log viewing
- Form validation

### 5. **smoke.spec.ts** - Production Smoke Tests
- Homepage loads
- Navigation works
- Key pages accessible
- Authentication flow
- Responsive design
- No critical errors

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test suite
```bash
npx playwright test auth
npx playwright test jobs
npx playwright test runner
npx playwright test profile
npx playwright test smoke
```

### Run tests in UI mode (interactive)
```bash
npx playwright test --ui
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug tests
```bash
npx playwright test --debug
```

### Generate test report
```bash
npx playwright show-report
```

## Pre-requisites

1. **Frontend dev server running**
   ```bash
   cd frontend
   npm run dev
   ```
   Server should be running on `http://localhost:5173`

2. **Backend API running** (optional, but recommended)
   ```bash
   cd backend
   npm run dev
   ```
   API should be running on `http://localhost:3000`

3. **Test users created** in database:
   - Username: `testuser`, Password: `password123`
   - Username: `testrunner`, Password: `password123`

## Configuration

Tests are configured in `playwright.config.ts`:
- Base URL: `http://localhost:5173` (or `BASE_URL` env var)
- Browsers: Chromium, Firefox, WebKit
- Screenshots on failure
- Video recording on failure
- Trace on first retry

## CI/CD Integration

Tests run automatically on GitHub Actions:
- On push to main/develop branches
- On pull requests
- Playwright workflow: `.github/workflows/playwright.yml`

## Writing New Tests

Follow this pattern:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup (e.g., login, navigate)
  });

  test('should do something', async ({ page }) => {
    // Arrange: Navigate and prepare
    await page.goto('/some-page');
    
    // Act: Perform action
    await page.click('button');
    
    // Assert: Verify result
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

## Best Practices

1. **Use data-testid attributes** for reliable selectors
2. **Handle loading states** with `waitForTimeout` or `waitForSelector`
3. **Make tests resilient** by checking if elements exist before interacting
4. **Clean up after tests** to ensure isolation
5. **Use descriptive test names** that explain what's being tested
6. **Group related tests** in describe blocks

## Troubleshooting

### Tests fail with timeout
- Increase timeout in test or config
- Check if dev server is running
- Verify network requests complete

### Element not found
- Use Playwright Inspector: `npx playwright test --debug`
- Check selector with: `page.locator('selector').count()`
- Add explicit waits if page is slow to load

### Tests pass locally but fail in CI
- Check CI logs for specific errors
- Verify environment variables are set
- Ensure database is seeded correctly

### Screenshots/videos not captured
- Check `playwright.config.ts` settings
- Verify `test-results` folder permissions
- Review trace files: `npx playwright show-trace trace.zip`

## Test Coverage

Current test coverage:
- ✅ Authentication flows
- ✅ Job creation and management
- ✅ Runner profiles and assignment
- ✅ Profile editing and preferences
- ✅ Earnings dashboard
- ✅ Basic smoke tests

To improve coverage, consider adding:
- Payment flow tests
- Review system tests
- Real-time notification tests
- Mobile-specific tests
- Accessibility tests

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-test)
- [Debugging Guide](https://playwright.dev/docs/debug)
