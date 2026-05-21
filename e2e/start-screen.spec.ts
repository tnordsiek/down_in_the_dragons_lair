import { expect, test } from '@playwright/test';

test('starts the playable game screen', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Game Setup' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start Game' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start Game' }).click();

  await expect(page.getByLabel('Dungeon board')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actions' })).toBeVisible();
});
