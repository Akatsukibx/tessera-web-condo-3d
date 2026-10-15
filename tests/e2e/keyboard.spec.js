import { test, expect } from '@playwright/test';
import { openReady, scrollToSection } from './helpers.js';

test('first Tab focuses the skip link', async ({ page }) => {
  await openReady(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
});

test('chapter buttons: arrow keys move focus and aria-current', async ({ page }) => {
  await openReady(page);
  const buttons = page.locator('.chapter-nav button');
  await expect(buttons).toHaveCount(4);
  await buttons.nth(0).focus();
  await expect(buttons.nth(0)).toHaveAttribute('aria-current', 'step');

  await page.keyboard.press('ArrowRight');
  await expect(buttons.nth(1)).toBeFocused();
  await expect(buttons.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(buttons.nth(0)).not.toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#chapter-lobby')).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await expect(buttons.nth(2)).toHaveAttribute('aria-current', 'step');
  await page.keyboard.press('ArrowLeft');
  await expect(buttons.nth(1)).toHaveAttribute('aria-current', 'step');
  await page.keyboard.press('End');
  await expect(buttons.nth(3)).toBeFocused();
  await expect(buttons.nth(3)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#story-live')).toHaveText('Chapter 4 of 4: Balcony at dusk');
  await page.keyboard.press('Home');
  await expect(buttons.nth(0)).toHaveAttribute('aria-current', 'step');

  // Enter on a button activates it too
  await buttons.nth(2).focus();
  await page.keyboard.press('Enter');
  await expect(buttons.nth(2)).toHaveAttribute('aria-current', 'step');
});

test('residence tabs follow the ARIA tabs pattern', async ({ page }) => {
  await openReady(page);
  await scrollToSection(page, 'residences');
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(4);
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panel-2br')).toBeVisible();
  await expect(page.locator('#panel-1br')).toBeHidden();
  await page.keyboard.press('End');
  await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panel-ph svg title')).toHaveText('Penthouse floor plan, 420 sqm');
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');
});

test('booking form: errors focus the first invalid field, success focuses the heading', async ({ page }) => {
  await openReady(page);
  await scrollToSection(page, 'booking');
  const submit = page.getByRole('button', { name: 'Request a viewing' });
  await submit.focus();
  await page.keyboard.press('Enter');

  const name = page.locator('#f-name');
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAttribute('aria-describedby', /err-name/);
  await expect(page.locator('#err-name')).toHaveText('Enter your full name.');
  await expect(page.locator('#f-phone')).toHaveAttribute('aria-describedby', 'hint-phone err-phone');

  await name.fill('Napat Srisuk');
  await page.locator('#f-email').fill('napat@example.com');
  await page.locator('#f-phone').fill('+66 81 234 5678');
  await page.locator('#f-unit').selectOption('2br');
  const date = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await page.locator('#f-date').fill(date);
  await expect(name).not.toHaveAttribute('aria-invalid', 'true');

  await submit.focus();
  await page.keyboard.press('Enter');
  const heading = page.locator('#success-heading');
  await expect(heading).toBeFocused();
  await expect(heading).toHaveText('Thank you, Napat. This is a demonstration, so nothing was sent.');
  await expect(page.locator('#booking-success')).toHaveAttribute('role', 'status');

  await page.getByRole('button', { name: 'Book another viewing' }).click();
  await expect(name).toBeFocused();
  await expect(name).toHaveValue('');
});

test('chapter rail sits on the right edge with 44 px targets', async ({ page }) => {
  await openReady(page);
  const vw = page.viewportSize().width;
  const boxes = await page.locator('.chapter-nav button').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, w: r.width, h: r.height };
    }),
  );
  expect(boxes).toHaveLength(4);
  for (const b of boxes) {
    expect(b.left).toBeGreaterThan(vw * 0.6);
    expect(b.h).toBeGreaterThanOrEqual(44);
    expect(b.w).toBeGreaterThanOrEqual(44);
  }
  // Header does not overlap the rail.
  const header = await page.locator('.site-header').boundingBox();
  expect(boxes[0].left).toBeGreaterThan(0);
  const railTop = await page.locator('.chapter-nav').evaluate((el) => el.getBoundingClientRect().top);
  expect(railTop).toBeGreaterThan(header.y + header.height);
});

test('buttons and control links are at least 44 × 44 px', async ({ page }) => {
  await openReady(page);
  // Open the explorer panel so its buttons are measured too.
  await page.evaluate(() => window.__tessera.explorer.open(24));
  const sizes = await page.evaluate(() => {
    const sel = 'button, .btn, .primary-nav a, .brand, .footer-base a, [role="tab"], .explorer button, .floor-panel button';
    return [...document.querySelectorAll(sel)]
      .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { label: el.textContent.trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((s) => s.w > 0 && s.h > 0);
  });
  expect(sizes.length).toBeGreaterThan(8);
  for (const s of sizes) {
    expect(s.w, `${s.label} width`).toBeGreaterThanOrEqual(44);
    expect(s.h, `${s.label} height`).toBeGreaterThanOrEqual(44);
  }
});
