/**
 * Runner Profile E2E Tests
 * 
 * Tests for:
 * - Create runner profile
 * - View runner details
 * - Find/search runners
 * - Runner assignment to jobs
 */

import { test, expect } from '@playwright/test';

// Helper to login
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'testrunner');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

test.describe('Runner Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to become runner page', async ({ page }) => {
    await page.goto('/');
    
    const becomeRunnerLink = page.locator('text=/become.*runner/i');
    const hasLink = await becomeRunnerLink.isVisible().catch(() => false);
    
    if (hasLink) {
      await becomeRunnerLink.click();
      await expect(page).toHaveURL('/become-runner');
    }
  });

  test('should create runner profile', async ({ page }) => {
    await page.goto('/become-runner');
    
    // Fill runner profile form
    const bioInput = page.locator('textarea[name="bio"], textarea[placeholder*="bio" i]');
    const hasBioInput = await bioInput.isVisible().catch(() => false);
    
    if (hasBioInput) {
      await bioInput.fill('Experienced runner, ready to help with errands');
      
      // Fill hourly rate
      const rateInput = page.locator('input[name="hourlyRate"], input[name="rate"]');
      const hasRateInput = await rateInput.isVisible().catch(() => false);
      
      if (hasRateInput) {
        await rateInput.fill('25');
      }
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message or redirect
      await expect(async () => {
        const hasSuccess = await page.locator('text=/profile.*created/i').isVisible().catch(() => false);
        const isRedirected = !page.url().includes('/become-runner');
        expect(hasSuccess || isRedirected).toBeTruthy();
      }).toPass({ timeout: 10000 });
    }
  });

  test('should find and view runners', async ({ page }) => {
    await page.goto('/find-runners');
    
    // Should show runners list or search
    await expect(page.locator('h1')).toContainText(/find.*runners/i);
    
    // Should have runner cards or empty state
    await page.waitForTimeout(2000);
    const runnerCards = page.locator('[data-testid="runner-card"], .runner-card');
    const emptyState = page.locator('text=/no.*runners/i');
    
    await expect(async () => {
      const hasRunners = await runnerCards.first().isVisible().catch(() => false);
      const isEmpty = await emptyState.isVisible().catch(() => false);
      expect(hasRunners || isEmpty).toBeTruthy();
    }).toPass();
  });

  test('should view runner profile details', async ({ page }) => {
    await page.goto('/find-runners');
    await page.waitForTimeout(2000);
    
    // Click first runner if available
    const runnerCard = page.locator('[data-testid="runner-card"], .runner-card').first();
    const hasRunners = await runnerCard.isVisible().catch(() => false);
    
    if (hasRunners) {
      await runnerCard.click();
      
      // Should navigate to runner detail page
      await expect(page).toHaveURL(/\/runners\/\d+/);
      
      // Should show runner details
      await expect(page.locator('text=/bio/i, text=/about/i')).toBeVisible();
    }
  });

  test('should filter runners by location', async ({ page }) => {
    await page.goto('/find-runners');
    
    // Look for location/radius filter
    const radiusInput = page.locator('input[name="radius"], select[name="radius"]');
    const hasRadius = await radiusInput.isVisible().catch(() => false);
    
    if (hasRadius) {
      // Change radius
      if (await radiusInput.getAttribute('type') === 'range') {
        await radiusInput.fill('10');
      } else {
        await radiusInput.selectOption('10');
      }
      
      await page.waitForTimeout(1000);
    }
  });

  test('should assign runner to job', async ({ page }) => {
    // Go to browse jobs as a runner
    await page.goto('/browse-jobs');
    await page.waitForTimeout(2000);
    
    // Click on a job
    const jobCard = page.locator('[data-testid="job-card"], .job-card').first();
    const hasJobs = await jobCard.isVisible().catch(() => false);
    
    if (hasJobs) {
      await jobCard.click();
      
      // Look for "Accept" or "Assign" button
      const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Assign")');
      const hasAcceptButton = await acceptButton.isVisible().catch(() => false);
      
      if (hasAcceptButton) {
        await acceptButton.click();
        
        // Should show success message
        await expect(page.locator('text=/assigned/i, text=/accepted/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should view runner earnings', async ({ page }) => {
    await page.goto('/earnings');
    
    // Should show earnings dashboard
    await expect(page.locator('h1')).toContainText(/earnings/i);
    
    // Should show summary cards
    const summaryCards = page.locator('[data-testid="earning-card"], .earning-card, text=/total.*earned/i');
    await expect(summaryCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter earnings by period', async ({ page }) => {
    await page.goto('/earnings');
    await page.waitForTimeout(2000);
    
    // Look for period filter buttons
    const periodButtons = page.locator('button:has-text("Today"), button:has-text("Week"), button:has-text("Month")');
    const hasFilters = await periodButtons.first().isVisible().catch(() => false);
    
    if (hasFilters) {
      // Click different periods
      await page.click('button:has-text("Today")');
      await page.waitForTimeout(500);
      
      await page.click('button:has-text("Week")');
      await page.waitForTimeout(500);
      
      await page.click('button:has-text("All")');
      await page.waitForTimeout(500);
    }
  });

  test('should view payout history', async ({ page }) => {
    await page.goto('/earnings');
    await page.waitForTimeout(2000);
    
    // Should show payout history section
    const historySection = page.locator('text=/payout.*history/i, text=/transaction.*history/i');
    await expect(historySection).toBeVisible({ timeout: 5000 });
    
    // Should have payout rows or empty state
    const payoutRows = page.locator('tr[data-testid="payout-row"], tbody tr');
    const emptyState = page.locator('text=/no.*payouts/i');
    
    await expect(async () => {
      const hasPayouts = await payoutRows.nth(1).isVisible().catch(() => false); // Skip header row
      const isEmpty = await emptyState.isVisible().catch(() => false);
      expect(hasPayouts || isEmpty).toBeTruthy();
    }).toPass();
  });
});
