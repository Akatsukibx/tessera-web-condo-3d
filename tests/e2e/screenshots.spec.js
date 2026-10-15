import { test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { openReady, scrollToSection } from './helpers.js';

import { mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';

// Primary output: <root>/screenshots/<project>; mirrored to tests/screenshots/<project> (plan item 9).
const ROOT = fileURLToPath(new URL('../../screenshots/', import.meta.url));
const MIRROR = fileURLToPath(new URL('../screenshots/', import.meta.url));
const out = (project, name) => path.join(ROOT, project, `${name}.png`);

test.afterEach(async ({}, info) => {
  const project = info.project.name;
  const src = path.join(ROOT, project);
  if (!existsSync(src)) return;
  mkdirSync(path.join(MIRROR, project), { recursive: true });
  for (const f of readdirSync(src)) copyFileSync(path.join(src, f), path.join(MIRROR, project, f));
});
const CHAPTER_NAMES = ['01-arrival', '02-lobby', '03-living-room', '04-balcony'];
const SECTIONS = ['overview', 'residences', 'amenities', 'location', 'booking'];

async function chapterShots(page, project, suffix = '') {
  for (let i = 0; i < CHAPTER_NAMES.length; i++) {
    await page.evaluate((idx) => window.__tessera.goToChapter(idx), i);
    await page.waitForTimeout(900);
    await page.screenshot({ path: out(project, `chapter-${CHAPTER_NAMES[i]}${suffix}`) });
  }
}

test('chapters, sections and full page', async ({ page }, info) => {
  const project = info.project.name;
  await openReady(page);
  await chapterShots(page, project);
  for (const id of SECTIONS) {
    await scrollToSection(page, id);
    await page.screenshot({ path: out(project, `section-${id}`) });
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(600);
  await page.screenshot({ path: out(project, 'full-page'), fullPage: true });
});

test('Tower Explorer: idle, hover, panel and floor plans', async ({ page }, info) => {
  const project = info.project.name;
  await openReady(page);
  await scrollToSection(page, 'residences');
  await page.evaluate(() => {
    window.__tessera.explorer.idle(false);
    window.__tessera.explorer.setYaw(0);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out(project, 'section-explorer') });

  const p = await page.evaluate(() => window.__tessera.explorer.screenPointForLevel(24));
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(400);
  await page.screenshot({ path: out(project, 'section-explorer-hover') });

  await page.evaluate(() => window.__tessera.explorer.open(24));
  await page.mouse.move(5, 300);
  await page.waitForTimeout(600);
  await page.screenshot({ path: out(project, 'section-explorer-panel') });

  await page.evaluate(() => window.__tessera.explorer.open(38));
  await page.waitForTimeout(400);
  await page.screenshot({ path: out(project, 'section-explorer-panel-38') });
  await page.evaluate(() => window.__tessera.explorer.close());

  await scrollToSection(page, 'plans');
  await page.screenshot({ path: out(project, 'section-floorplans') });
});

test('WebGL off fallback', async ({ page }, info) => {
  await openReady(page, '/?nowebgl');
  await page.screenshot({ path: out(info.project.name, 'fallback-nowebgl') });
  await scrollToSection(page, 'residences');
  await page.screenshot({ path: out(info.project.name, 'section-explorer-nowebgl') });
  await page.evaluate(() => window.__tessera.explorer.open(24));
  await page.waitForTimeout(200);
  await page.screenshot({ path: out(info.project.name, 'section-explorer-nowebgl-panel') });
});

test('form error state', async ({ page }, info) => {
  await openReady(page);
  await scrollToSection(page, 'booking');
  await page.getByRole('button', { name: 'Request a viewing' }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: out(info.project.name, 'section-booking-errors') });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('chapters snap without tweening', async ({ page }, info) => {
    await openReady(page);
    await chapterShots(page, info.project.name, '-reduced');
  });
});
