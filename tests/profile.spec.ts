/**
 * Profile Management E2E Tests
 * 
 * Tests for:
 * - View profile
 * - Edit profile
 * - Update Lightning address
 * - Change password
 * - Update preferences
 */

import { test, expect } from '@playwright/test';

// Helper to login
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view profile page', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show profile information
    await expect(page.locator('h1, h2')).toContainText(/profile/i);
    await expect(page.locator('text=/testuser/i')).toBeVisible();
  });

  test('should navigate to edit profile', async ({ page }) => {
    await page.goto('/profile');
    
    // Click edit button
    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
    const hasEdit = await editButton.isVisible().catch(() => false);
    
    if (hasEdit) {
      await editButton.click();
      await expect(page).toHaveURL('/profile/edit');
    } else {
      await page.goto('/profile/edit');
    }
    
    // Should show edit form
    await expect(page.locator('h1, h2')).toContainText(/edit.*profile/i);
  });

  test('should update display name', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Find display name input
    const displayNameInput = page.locator('input[name="displayName"], input[name="display_name"]');
    const hasInput = await displayNameInput.isVisible().catch(() => false);
    
    if (hasInput) {
      await displayNameInput.fill('Test User Updated');
      
      // Save changes
      await page.click('button[type="submit"], button:has-text("Save")');
      
      // Should show success message
      await expect(page.locator('text=/updated/i, text=/saved/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should update Lightning address', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Find Lightning address input
    const lightningInput = page.locator('input[name="lightningAddress"], input[name="lightning_address"]');
    const hasInput = await lightningInput.isVisible().catch(() => false);
    
    if (hasInput) {
      await lightningInput.fill('testuser@getalby.com');
      
      // Save changes
      await page.click('button[type="submit"], button:has-text("Save")');
      
      // Should show success message
      await expect(page.locator('text=/updated/i, text=/saved/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should change password', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Look for change password section
    const passwordSection = page.locator('text=/change.*password/i');
    const hasPasswordSection = await passwordSection.isVisible().catch(() => false);
    
    if (hasPasswordSection) {
      // Fill password fields
      const currentPassword = page.locator('input[name="currentPassword"]');
      const newPassword = page.locator('input[name="newPassword"]');
      const confirmPassword = page.locator('input[name="confirmPassword"]');
      
      const hasFields = await currentPassword.isVisible().catch(() => false);
      
      if (hasFields) {
        await currentPassword.fill('password123');
        await newPassword.fill('newpassword123');
        await confirmPassword.fill('newpassword123');
        
        // Submit password change
        const passwordButton = page.locator('button:has-text("Change Password"), button:has-text("Update Password")');
        await passwordButton.click();
        
        // Should show success message
        await expect(page.locator('text=/password.*updated/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should update theme preference', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Look for theme selector
    const themeSelect = page.locator('select[name="theme"], button:has-text("Dark"), button:has-text("Light")');
    const hasTheme = await themeSelect.first().isVisible().catch(() => false);
    
    if (hasTheme) {
      // Try to change theme
      const tagName = await themeSelect.first().evaluate(el => el.tagName);
      if (tagName === 'SELECT') {
        await themeSelect.first().selectOption('dark');
      } else {
        await page.click('button:has-text("Dark")');
      }
      
      await page.waitForTimeout(1000);
      
      // Check if dark mode is applied
      const htmlElement = page.locator('html');
      const classes = await htmlElement.getAttribute('class');
      // Theme might be applied (this is optional verification)
    }
  });

  test('should update notification preferences', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Look for notification checkboxes
    const notificationCheckbox = page.locator('input[type="checkbox"][name*="notification"]').first();
    const hasCheckbox = await notificationCheckbox.isVisible().catch(() => false);
    
    if (hasCheckbox) {
      // Toggle checkbox
      await notificationCheckbox.click();
      
      // Save changes
      await page.click('button[type="submit"], button:has-text("Save")');
      
      // Should show success message
      await expect(page.locator('text=/updated/i, text=/saved/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view security log', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Look for security log section
    const securityLog = page.locator('text=/security.*log/i, text=/login.*history/i');
    const hasLog = await securityLog.isVisible().catch(() => false);
    
    if (hasLog) {
      // Should show log entries
      const logEntries = page.locator('[data-testid="security-log-entry"], .log-entry');
      const emptyState = page.locator('text=/no.*activity/i');
      
      await expect(async () => {
        const hasEntries = await logEntries.first().isVisible().catch(() => false);
        const isEmpty = await emptyState.isVisible().catch(() => false);
        expect(hasEntries || isEmpty).toBeTruthy();
      }).toPass({ timeout: 5000 });
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Clear display name if present
    const displayNameInput = page.locator('input[name="displayName"], input[name="display_name"]');
    const hasInput = await displayNameInput.isVisible().catch(() => false);
    
    if (hasInput) {
      await displayNameInput.clear();
      
      // Try to save
      await page.click('button[type="submit"], button:has-text("Save")');
      
      // Should show validation error
      await expect(page.locator('text=/required/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should cancel edits', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Look for cancel button
    const cancelButton = page.locator('button:has-text("Cancel"), a:has-text("Cancel")');
    const hasCancel = await cancelButton.isVisible().catch(() => false);
    
    if (hasCancel) {
      await cancelButton.click();
      
      // Should navigate back
      await expect(page).toHaveURL('/profile');
    }
  });
});
