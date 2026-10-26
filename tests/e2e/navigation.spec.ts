import { expect, test } from '@playwright/test';

for (const width of [375, 1024]) {
  test(`navigation opens as a right-aligned dropdown at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/risk-model');
    const toggle = page.getByRole('button', { name: /導覽選單/ });
    const navigation = page.getByRole('navigation', { name: '主要頁面', includeHidden: true });
    const title = page.getByRole('heading', { level: 1 });
    const originalTop = (await title.boundingBox())!.y;

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(navigation).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAttribute('aria-controls', await navigation.getAttribute('id') as string);
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole('link', { name: '地圖探索', exact: true })).toBeVisible();
    await expect(navigation.getByRole('link', { name: '鼠跡通報', exact: true })).toBeVisible();
    await expect(navigation.getByRole('link', { name: '登入', exact: true })).toBeVisible();
    await expect(navigation.locator('.button-text__number').first()).toBeHidden();
    expect((await title.boundingBox())!.y).toBe(originalTop);
    const bounds = (await navigation.boundingBox())!;
    expect(bounds.x).toBeGreaterThan(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

    await toggle.click();
    await expect(navigation).toBeHidden();
  });
}

test('navigation closes on Escape and returns focus to its button', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/risk-model');
  const toggle = page.getByRole('button', { name: /導覽選單/ });
  await toggle.focus();
  await toggle.press('Space');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '地圖探索', exact: true }).first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('navigation closes on outside press, focus leaving and page selection', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/risk-model');
  const toggle = page.getByRole('button', { name: /導覽選單/ });
  const navigation = page.getByRole('navigation', { name: '主要頁面', includeHidden: true });
  await toggle.click();
  await page.getByRole('heading', { level: 1 }).click({ position: { x: 8, y: 8 } });
  await expect(navigation).toBeHidden();

  await toggle.click();
  await navigation.getByRole('link', { name: '登入', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await navigation.getByRole('link', { name: '文獻知識', exact: true }).click();
  await expect(page).toHaveURL(/\/literature$/);
  await expect(page.getByRole('button', { name: /導覽選單/ })).toHaveAttribute('aria-expanded', 'false');
});

test('desktop navigation remains visible and resizing back closes the dropdown', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/risk-model');
  const toggle = page.getByRole('button', { name: /導覽選單/, includeHidden: true });
  const navigation = page.getByRole('navigation', { name: '主要頁面', includeHidden: true });
  await toggle.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(toggle).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeVisible();
  await expect(navigation.locator('.button-text__number').first()).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeHidden();
});

test('short landscape screens can scroll to the authentication link', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 320 });
  await page.goto('/risk-model');
  await page.getByRole('button', { name: /導覽選單/ }).click();
  const navigation = page.getByRole('navigation', { name: '主要頁面' });
  expect(await navigation.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  const login = navigation.getByRole('link', { name: '登入', exact: true });
  await login.scrollIntoViewIfNeeded();
  await login.click();
  await expect(page).toHaveURL(/\/login$/);
});
