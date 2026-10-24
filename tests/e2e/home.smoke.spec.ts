import { expect, test } from '@playwright/test';

test('the web application mounts at the root route', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#root')).toBeVisible();
});
