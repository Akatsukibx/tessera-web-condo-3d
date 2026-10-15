import { expect } from '@playwright/test';

export async function openReady(page, url = '/') {
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-scene-ready', 'true', { timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
}

/** Scrolls so the section top sits just under the sticky header. */
export async function scrollToSection(page, id) {
  await page.evaluate((sectionId) => {
    const el = document.getElementById(sectionId);
    const header = document.querySelector('.site-header');
    const top = el.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0);
    window.scrollTo({ top, behavior: 'instant' });
  }, id);
  await page.waitForTimeout(300);
}

export const BANNED = [
  'unparalleled',
  'world-class',
  'best-ever',
  'iconic',
  'breathtaking',
  'luxurious lifestyle',
  'stunning',
  'ultimate',
  'lorem',
  'ipsum',
];
