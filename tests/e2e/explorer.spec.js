import { test, expect } from '@playwright/test';
import { openReady, scrollToSection } from './helpers.js';

async function openExplorer(page, url = '/') {
  await openReady(page, url);
  await scrollToSection(page, 'residences');
  await page.evaluate(() => window.__tessera.explorer.idle(false));
}

test('keyboard: the level control selects a floor and opens the panel; Escape closes it', async ({ page }) => {
  await openExplorer(page);
  const range = page.locator('#floor-range');
  await range.focus();
  await page.keyboard.press('Home');
  await expect(range).toHaveValue('1');
  for (let i = 0; i < 23; i++) await page.keyboard.press('ArrowUp');
  await expect(range).toHaveValue('24');
  await expect(range).toHaveAttribute('aria-valuetext', 'Level 24, 5 residences');
  await expect(page.locator('#floor-live')).toContainText('Level 24');
  await expect(page.locator('#floor-readout-text')).toHaveText('Level 24 · 5 residences');

  await page.keyboard.press('Enter');
  const panel = page.locator('#floor-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('role', 'dialog');
  await expect(page.locator('#floor-panel-title')).toBeFocused();
  await expect(page.locator('#floor-panel-title')).toHaveText('Residences on level 24');
  await expect(page.locator('#floor-open')).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(range).toBeFocused();

  // The close button also closes it and returns focus to the invoker.
  await page.locator('#floor-open').click();
  await expect(page.locator('#floor-panel-title')).toBeFocused();
  await page.getByRole('button', { name: 'Close level details' }).click();
  await expect(panel).toBeHidden();
  await expect(page.locator('#floor-open')).toBeFocused();
});

test('mouse: hovering a floor on the 3D tower shows a tooltip, a click opens the panel', async ({ page }) => {
  await openExplorer(page);
  await expect.poll(() => page.evaluate(() => window.__tessera.explorer.mode)).toBe('explorer');
  await page.evaluate(() => window.__tessera.explorer.setYaw(0));
  const p = await page.evaluate(() => window.__tessera.explorer.screenPointForLevel(24));
  expect(p).not.toBeNull();
  await page.mouse.move(p.x, p.y);
  await expect(page.locator('.floor-tip')).toBeVisible();
  await expect(page.locator('.floor-tip')).toContainText('Level 24');
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('#floor-panel')).toBeVisible();
  await expect(page.locator('#floor-panel-title')).toContainText('level 24');
  await expect(page.locator('#floor-panel-title')).toBeFocused();
});

test('book: the panel preselects the residence type in the booking form', async ({ page }) => {
  await openExplorer(page);
  await page.evaluate(() => window.__tessera.explorer.open(24));
  const panel = page.locator('#floor-panel');
  await expect(panel).toBeVisible();
  const plan3 = panel.getByRole('button', { name: '3 Bedroom' });
  await plan3.click();
  await expect(plan3).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('.panel-plan svg title')).toHaveText('3 Bedroom floor plan, 168 sqm');
  await panel.getByRole('button', { name: 'Book a viewing for this residence' }).click();
  await expect(page.locator('#f-unit')).toHaveValue('3br');
  await expect(page.locator('#f-name')).toBeFocused();
  await expect(page.locator('#booking')).toBeInViewport();
  await expect(panel).toBeHidden();
});

test('enter the sample residence jumps to walkthrough chapter 3', async ({ page }) => {
  await openExplorer(page);
  await page.getByRole('button', { name: 'Enter the sample residence' }).click();
  await expect.poll(() => page.evaluate(() => window.__tessera.chapter)).toBe(2);
  await expect(page.locator('.chapter-nav button').nth(2)).toBeFocused();
});

test('explorer mode stays within the draw-call budget', async ({ page }) => {
  await openExplorer(page);
  await expect.poll(() => page.evaluate(() => window.__tessera.explorer.mode)).toBe('explorer');
  await page.evaluate(() => window.__tessera.explorer.setYaw(0));
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => window.__tessera.renderInfo());
  console.log(`[render-info] ${test.info().project.name} explorer calls=${info.calls} triangles=${info.triangles}`);
  expect(info.calls).toBeLessThanOrEqual(250);
  await page.evaluate(() => window.__tessera.explorer.open(38));
  await page.waitForTimeout(300);
  const open = await page.evaluate(() => window.__tessera.renderInfo());
  expect(open.calls).toBeLessThanOrEqual(250);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no idle rotation', async ({ page }) => {
    await openReady(page);
    await scrollToSection(page, 'residences');
    await expect.poll(() => page.evaluate(() => window.__tessera.explorer.mode)).toBe('explorer');
    const before = await page.evaluate(() => window.__tessera.explorer.getYaw());
    await page.evaluate(() => window.__tessera.explorer.idle(true));
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.__tessera.explorer.getYaw())).toBe(before);
  });
});

test('?nowebgl: the SVG elevation drives the same panel', async ({ page }) => {
  await openExplorer(page, '/?nowebgl');
  await expect(page.locator('.explorer-scene svg[role="img"]')).toBeVisible();
  const band = page.locator('.band[data-level="38"]');
  await band.hover();
  await expect(page.locator('.floor-tip')).toContainText('Level 38');
  await band.click();
  await expect(page.locator('#floor-panel')).toBeVisible();
  await expect(page.locator('#floor-panel-title')).toContainText('Sky lounge');
  await expect(page.locator('#floor-panel-title')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#floor-panel')).toBeHidden();
  await expect(page.locator('#floor-range')).toBeFocused();
});
