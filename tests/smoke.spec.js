import { test, expect } from '@playwright/test';

test('la pagina si carica senza errori', async ({ page }) => {
  const errors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  const response = await page.goto('/');

  expect(response).not.toBeNull();
  expect(response.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  expect(errors).toEqual([]);
});
