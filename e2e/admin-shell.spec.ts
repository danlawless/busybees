import { test, expect, type Page } from '@playwright/test';

// Codes come from the environment only. Use a non-production database.
const STAFF = process.env.E2E_STAFF_PIN!;
const ADMIN = process.env.E2E_ADMIN_PIN!;

// The anonymous-API test needs no codes; every other test skips without them.
const skipWithoutPins = () =>
  test.skip(!STAFF || !ADMIN, 'set E2E_STAFF_PIN and E2E_ADMIN_PIN');

async function enter(page: Page, pin: string) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
}

test('staff sees everything but Owner, upgrades with the admin code', async ({ page }) => {
  skipWithoutPins();
  await page.goto('/admin/parties');
  await expect(page).toHaveURL(/\/admin\/login\?to=%2Fadmin%2Fparties/);
  await enter(page, STAFF);
  await expect(page).toHaveURL(/\/admin\/parties$/);
  await expect(page.getByText('Signed in as Staff')).toBeVisible();

  await page.getByRole('button', { name: /Owner/ }).click();
  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByText('Owner area')).toBeVisible();
  await enter(page, ADMIN);
  await expect(page.getByText('Signed in as Admin')).toBeVisible();
});

test('admin reaches every sidebar item and the session survives reload', async ({ page }) => {
  skipWithoutPins();
  await page.goto('/admin/login');
  await enter(page, ADMIN);
  await expect(page).toHaveURL(/\/admin$/);
  const hrefs = await page
    .locator('aside a[href^="/admin"]')
    .evaluateAll(as => as.map(a => a.getAttribute('href')!));
  for (const href of hrefs) {
    const res = await page.goto(href);
    expect(res?.status(), href).toBeLessThan(400);
    await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
    await expect(page.getByText('Owner area')).toHaveCount(0);
  }
  await page.reload();
  await expect(page.getByText('Signed in as Admin')).toBeVisible();
});

test('wrong code shows a message and Lock ends the session', async ({ page }) => {
  skipWithoutPins();
  await page.goto('/admin/login');
  // Must differ from both E2E_STAFF_PIN and E2E_ADMIN_PIN.
  await enter(page, '0000');
  await expect(page.getByRole('alert')).toContainText("didn't match");
  await enter(page, ADMIN);
  await page.getByRole('button', { name: 'Lock' }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('admin APIs refuse anonymous callers', async ({ request }) => {
  for (const p of ['/api/admin/customers', '/api/admin/reports/overview', '/api/admin/gift-cards', '/api/settings']) {
    const res = await request.get(p);
    expect(res.status(), p).toBe(401);
  }
  const post = await request.post('/api/editor/content', { data: {} });
  expect(post.status(), '/api/editor/content').toBe(401);
});

test('mobile drawer opens and closes', async ({ page }) => {
  skipWithoutPins();
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/admin/login');
  await enter(page, STAFF);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Bookings' }).click();
  await page.getByRole('link', { name: 'Events' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/events$/);
});
