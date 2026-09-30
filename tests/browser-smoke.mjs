import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const password = readFileSync(process.env.SCRATCH_PASSWORD_FILE, 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5175/', { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').fill('amina@example.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: 'Choose your password.' }).waitFor();
  await page.getByLabel('Temporary password').fill(password);
  await page.getByLabel('New password', { exact: true }).fill('PrivatePartnerPassword123!');
  await page.getByLabel('Confirm new password').fill('PrivatePartnerPassword123!');
  await page.getByRole('button', { name: 'Save password' }).click();
  await page.getByRole('heading', { name: 'Good to see you, Amina.' }).waitFor();
  await page.getByText('Kano Kitchen').waitFor();
  assert.equal(await page.locator('.stat-card').first().locator('strong').innerText(), '1');
  mkdirSync('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/partner-overview-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Vendor introductions', exact: true }).click();
  await page.getByRole('heading', { name: '1 vendor recorded' }).waitFor();
  await page.getByText('Kano Kitchen').waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`);
  }
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/partner-overview-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: partner login, forced password change, real referral count and list, responsive widths 320/390/768/1440, no page errors.');
} finally { await browser.close(); }
