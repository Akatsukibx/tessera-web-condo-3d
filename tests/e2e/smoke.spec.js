import { test, expect } from '@playwright/test';
import { openReady, BANNED } from './helpers.js';

test('loads with WebGL, no console errors, real copy only', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await openReady(page);
  await expect(page.locator('canvas#scene-canvas')).toHaveCount(1);
  await expect(page.locator('.scene-fallback')).toHaveCount(0);

  await expect(page.locator('footer')).toContainText('Concept demonstration. Tessera Sathorn is a fictional project.');
  await expect(page.locator('.primary-nav a')).toHaveText(['Walkthrough', 'Residences', 'Amenities', 'Location']);
  // The project title appears once, as the h1 of the chapter 1 intro.
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('#chapter-arrival h1')).toHaveText('Tessera Sathorn');
  await expect(page.locator('.site-header')).toHaveAttribute('data-tone', 'scene');
  // No opaque panel over the scene, and the residence-type table is gone.
  await expect(page.locator('.story-panel')).toHaveCount(0);
  await expect(page.locator('.units-table')).toHaveCount(0);

  const text = (await page.locator('body').textContent()).toLowerCase();
  for (const word of BANNED) expect(text, `banned word "${word}"`).not.toContain(word);
  expect(text).not.toContain('!');

  // Let the render loop run a moment so late errors surface.
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});

test('?nowebgl shows the static SVG fallback, never a blank canvas', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openReady(page, '/?nowebgl');
  await expect(page.locator('canvas')).toHaveCount(0);
  const svg = page.locator('.scene-fallback svg[role="img"]');
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute('aria-label', /Tessera Sathorn tower/);
  await expect(page.locator('.explorer-scene svg[role="img"]')).toBeAttached();
  await expect(page.locator('.explorer-scene .band')).toHaveCount(42);
  // Chapter navigation still works without WebGL
  await page.evaluate(() => window.__tessera.goToChapter(2));
  await expect(page.locator('#chapter-living')).toBeVisible();
  expect(await page.evaluate(() => window.__tessera.renderInfo())).toBeNull();
  expect(errors).toEqual([]);
});

test('draw calls stay within budget', async ({ page }) => {
  await openReady(page);
  for (let i = 0; i < 4; i++) {
    await page.evaluate((n) => window.__tessera.goToChapter(n), i);
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => window.__tessera.renderInfo());
    expect(info, `chapter ${i + 1} render info`).not.toBeNull();
    console.log(`[render-info] ${test.info().project.name} ch${i + 1} calls=${info.calls} triangles=${info.triangles}`);
    expect(info.calls, `chapter ${i + 1} draw calls`).toBeLessThanOrEqual(250);
  }
});
