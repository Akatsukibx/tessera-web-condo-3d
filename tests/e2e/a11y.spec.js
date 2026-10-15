import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openReady, scrollToSection } from './helpers.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];

const summarize = (violations) =>
  violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n');

async function audit(page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations, summarize(violations)).toEqual([]);
}

test('default page has no axe violations', async ({ page }) => {
  await openReady(page);
  await audit(page);
});

test('?nowebgl page has no axe violations', async ({ page }) => {
  await openReady(page, '/?nowebgl');
  await audit(page);
});

test('explorer panel open has no axe violations', async ({ page }) => {
  await openReady(page);
  await scrollToSection(page, 'residences');
  await page.evaluate(() => window.__tessera.explorer.open(24));
  await expect(page.locator('#floor-panel')).toBeVisible();
  await audit(page);
});

test('?nowebgl explorer panel open has no axe violations', async ({ page }) => {
  await openReady(page, '/?nowebgl');
  await scrollToSection(page, 'residences');
  await page.evaluate(() => window.__tessera.explorer.open(38));
  await expect(page.locator('#floor-panel')).toBeVisible();
  await audit(page);
});

test('form error state has no axe violations', async ({ page }) => {
  await openReady(page);
  await scrollToSection(page, 'booking');
  await page.getByRole('button', { name: 'Request a viewing' }).click();
  await expect(page.locator('#f-name')).toHaveAttribute('aria-invalid', 'true');
  await audit(page);
});
