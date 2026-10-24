import { expect, test } from '@playwright/test';

test.describe('literature pages', () => {
  test('lists all 17 resources and filters by search and tag', async ({ page }) => {
    await page.goto('/literature');
    await expect(page.getByText('SHOWING 17 / 17')).toBeVisible();

    await page.getByRole('searchbox', { name: '搜尋' }).fill('zzzzzz');
    await expect(page.getByText('沒有符合條件的文獻')).toBeVisible();

    await page.getByRole('button', { name: '清除篩選' }).click();
    await expect(page.getByText('SHOWING 17 / 17')).toBeVisible();

    await page.getByRole('group').first().getByRole('button').first().click();
    await expect(page.getByText(/SHOWING \d+ \/ 17/)).not.toHaveText('SHOWING 17 / 17');
  });

  test('opens a detail page with sources, table of contents and no interactive widgets', async ({ page }) => {
    await page.goto('/literature');
    await page.getByRole('link', { name: '閱讀整理' }).first().click();

    await expect(page).toHaveURL(/\/literature\/[0-9a-f-]{36}$/);
    await expect(page.locator('#lit-sources')).toBeVisible();
    await expect(page.locator('#lit-toc')).toBeVisible();
    await expect(page.locator('.literature-content script, .literature-content button, .literature-content input')).toHaveCount(0);
  });

  test('internal links navigate client-side to another resource', async ({ page }) => {
    await page.goto('/literature');
    await page.getByRole('link', { name: '閱讀整理' }).first().click();
    const next = page.getByRole('navigation', { name: '上下篇文獻' }).getByRole('link').last();
    const title = await next.innerText();
    await next.click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title.replace(/下一篇 →|← 上一篇/g, '').trim().slice(0, 12));
  });
});

test('signed-out visitors see the 通報 entry in the header, not 作業平台', async ({ page }) => {
  await page.goto('/literature');
  await expect(page.getByRole('navigation', { name: '主要頁面' }).getByText('通報')).toBeVisible();
  await expect(page.getByRole('navigation', { name: '主要頁面' }).getByText('作業平台')).toHaveCount(0);
});
