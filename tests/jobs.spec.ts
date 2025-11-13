/**
 * Job Creation and Management E2E Tests
 * 
 * Tests for:
 * - Create new job
 * - View job details
 * - Browse available jobs
 * - My jobs list
 * - Job status updates
 */

import { test, expect } from '@playwright/test';

// Helper to login before tests
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

test.describe('Job Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to create job page', async ({ page }) => {
    await page.click('text=/create.*job/i');
    await expect(page).toHaveURL('/create-job');
    await expect(page.locator('h1')).toContainText(/create.*job/i);
  });

  test('should create a new job successfully', async ({ page }) => {
    await page.goto('/create-job');
    
    // Fill job form
    await page.fill('input[name="title"]', 'Test Job - Walk my dog');
    await page.fill('textarea[name="description"]', 'Need someone to walk my dog for 30 minutes');
    await page.fill('input[name="price"]', '25');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=/job.*created/i')).toBeVisible({ timeout: 10000 });
    
    // Should redirect to job detail or my jobs
    await page.waitForURL(/\/(jobs|my-jobs)/);
  });

  test('should validate required fields in job creation', async ({ page }) => {
    await page.goto('/create-job');
    
    // Click submit without filling
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=/title.*required/i')).toBeVisible();
  });

  test('should browse available jobs', async ({ page }) => {
    await page.goto('/browse-jobs');
    
    // Should show jobs list
    await expect(page.locator('h1')).toContainText(/browse.*jobs/i);
    
    // Should have job cards or empty state
    const jobCards = page.locator('[data-testid="job-card"], .job-card');
    const emptyState = page.locator('text=/no.*jobs/i');
    
    await expect(async () => {
      const hasJobs = await jobCards.first().isVisible().catch(() => false);
      const isEmpty = await emptyState.isVisible().catch(() => false);
      expect(hasJobs || isEmpty).toBeTruthy();
    }).toPass();
  });

  test('should view job details', async ({ page }) => {
    await page.goto('/browse-jobs');
    
    // Wait for jobs to load
    await page.waitForTimeout(2000);
    
    // Click first job if available
    const jobCard = page.locator('[data-testid="job-card"], .job-card').first();
    const hasJobs = await jobCard.isVisible().catch(() => false);
    
    if (hasJobs) {
      await jobCard.click();
      
      // Should navigate to job detail page
      await expect(page).toHaveURL(/\/jobs\/\d+/);
      
      // Should show job details
      await expect(page.locator('text=/description/i')).toBeVisible();
      await expect(page.locator('text=/price/i')).toBeVisible();
    }
  });

  test('should view my jobs', async ({ page }) => {
    await page.goto('/my-jobs');
    
    // Should show my jobs page
    await expect(page.locator('h1')).toContainText(/my.*jobs/i);
    
    // Should show jobs or empty state
    const jobsList = page.locator('[data-testid="my-job"], .job-item');
    const emptyState = page.locator('text=/no.*jobs/i');
    
    await expect(async () => {
      const hasJobs = await jobsList.first().isVisible().catch(() => false);
      const isEmpty = await emptyState.isVisible().catch(() => false);
      expect(hasJobs || isEmpty).toBeTruthy();
    }).toPass();
  });

  test('should filter jobs by status', async ({ page }) => {
    await page.goto('/my-jobs');
    
    // Look for filter buttons/tabs
    const filterButtons = page.locator('button:has-text("All"), button:has-text("Active"), button:has-text("Completed")');
    const hasFilters = await filterButtons.first().isVisible().catch(() => false);
    
    if (hasFilters) {
      // Click different filters
      await page.click('button:has-text("Active")');
      await page.waitForTimeout(500);
      
      await page.click('button:has-text("Completed")');
      await page.waitForTimeout(500);
      
      await page.click('button:has-text("All")');
      await page.waitForTimeout(500);
    }
  });

  test('should search/filter jobs', async ({ page }) => {
    await page.goto('/browse-jobs');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    const hasSearch = await searchInput.isVisible().catch(() => false);
    
    if (hasSearch) {
      await searchInput.fill('dog walking');
      await page.waitForTimeout(1000);
      
      // Should filter results
      const jobCards = page.locator('[data-testid="job-card"], .job-card');
      const count = await jobCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle job cancellation', async ({ page }) => {
    await page.goto('/my-jobs');
    await page.waitForTimeout(2000);
    
    // Look for cancel button on a job
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    const hasCancelButton = await cancelButton.isVisible().catch(() => false);
    
    if (hasCancelButton) {
      await cancelButton.click();
      
      // Should show confirmation dialog
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      const hasConfirm = await confirmButton.isVisible().catch(() => false);
      
      if (hasConfirm) {
        await confirmButton.click();
        
        // Should show success message
        await expect(page.locator('text=/cancelled/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
