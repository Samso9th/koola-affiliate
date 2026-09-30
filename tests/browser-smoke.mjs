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
  await page.getByRole('button', { name: 'New here? Create an account' }).click();
  await page.getByLabel('Full name').fill('New Partner');
  await page.getByLabel('Nigerian phone').fill('08031234567');
  await page.getByLabel('Email address').fill('new-partner@example.test');
  await page.getByLabel('Password', { exact: true }).fill('ChosenPrivatePassword123!');
  await page.getByLabel('Confirm password').fill('ChosenPrivatePassword123!');
  let registrationRequests = 0;
  await page.route('**/api/v1/affiliate/auth/register', route => { registrationRequests++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { challengeId: '123e4567-e89b-42d3-a456-426614174000' } }) }); });
  await page.getByLabel('Nigerian phone').fill('8031234567');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByText(/Enter a Nigerian mobile number/).waitFor();
  assert.equal(registrationRequests, 0);
  await page.getByLabel('Nigerian phone').fill('08031234567');
  await page.getByLabel('Password', { exact: true }).fill('abcdefghijklmn');
  await page.getByLabel('Confirm password').fill('abcdefghijklmn');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByText(/Use 12–128 characters/).waitFor();
  assert.equal(registrationRequests, 0);
  await page.getByLabel('Password', { exact: true }).fill('ChosenPrivatePassword123!');
  await page.getByLabel('Confirm password').fill('ChosenPrivatePassword123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  assert.equal(registrationRequests, 1);
  await page.getByRole('heading', { name: 'Check your email.' }).waitFor();
  await page.getByText('new-partner@example.test').waitFor();
  await page.unroute('**/api/v1/affiliate/auth/register');
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await page.getByLabel('Email address').fill('amina@example.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: 'Good to see you, Amina.' }).waitFor();
  await page.getByText('Kano Kitchen').waitFor();
  assert.equal(await page.locator('.stat-card').first().locator('strong').innerText(), '1');
  mkdirSync('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/partner-overview-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('heading', { name: 'Your identity is verified.' }).waitFor();
  await page.getByRole('button', { name: 'Set up authenticator' }).click();
  await page.getByRole('img', { name: 'Authenticator setup QR code' }).waitFor();
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
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Email address').fill('pending@example.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('11-digit NIN').fill('12345678901');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await page.getByRole('heading', { name: 'Your details are in review.' }).waitFor();
  assert.equal(await page.getByText("Cannot read properties of null").count(), 0);
  const { database } = await import('../../api/dist/src/db.js');
  const db = database(process.env.DATABASE_URL);
  try { await db.Affiliate.update({ status: 'active', identity_status: 'verified', identity_ciphertext: null, identity_last4: '8901', identity_reviewed_at: new Date() }, { where: { email: 'pending@example.test' } }); }
  finally { await db.db.close(); }
  await page.getByRole('heading', { name: 'Your identity is verified.' }).waitFor({ timeout: 20000 });
  await page.getByText('Your identity has been approved. Your partner code is ready.').waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: registration UI, direct partner login, NIN submission and automatic approval refresh, optional authenticator setup, real referral count and list, responsive widths 320/390/768/1440, no page errors.');
} finally { await browser.close(); }
