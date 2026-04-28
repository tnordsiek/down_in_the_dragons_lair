import { expect, test } from '@playwright/test';

test('shows the start screen placeholder', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: "Down in the Dragon's Lair" }),
  ).toBeVisible();
});
