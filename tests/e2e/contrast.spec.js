import { test, expect } from '@playwright/test';
import { openReady } from './helpers.js';

// axe cannot see text over the WebGL canvas, so this samples the rendered pixels instead.
// For each overlay label: hide the glyphs (color: transparent), screenshot the label box and take the
// relative luminance of what is left. "halo" keeps the label's own text-shadow (what the reader sees
// around the strokes); "bare" removes it too (scene + scrims only, worst case).

const AA = 4.5;
const CHAPTERS = 4;

const TARGETS = '.chapter:not([hidden]) .index-label, .chapter-nav button span';

/** Collects box and text colour for every target, tagging each with a stable id. */
const collect = (page) =>
  page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].map((el, i) => {
      el.dataset.contrastId = String(i);
      const r = el.getBoundingClientRect();
      const btn = el.closest('button');
      const name = btn
        ? `rail ${btn.dataset.index}${btn.getAttribute('aria-current') ? ' (current)' : ''} ${el.className || 'label'}`
        : 'index-label';
      return { id: i, name, text: el.textContent.trim(), color: getComputedStyle(el).color, x: r.x, y: r.y, w: r.width, h: r.height };
    });
  }, TARGETS);

/** Decodes a PNG in the page and returns sorted background luminances. */
const luminances = (page, png) =>
  page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const lin = (v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const out = [];
    for (let i = 0; i < d.length; i += 4) out.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]));
    return out.sort((a, b) => a - b);
  }, png.toString('base64'));

const relLum = (css) => {
  const [r, g, b] = css.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const ratio = (fg, bg) => (fg + 0.05) / (bg + 0.05);
const pick = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

async function measure(page, t, keepShadow) {
  const style = await page.addStyleTag({
    content: `[data-contrast-id="${t.id}"], [data-contrast-id="${t.id}"] * { color: transparent !important;${
      keepShadow ? '' : ' text-shadow: none !important;'
    } }`,
  });
  await page.waitForTimeout(150);
  const png = await page.screenshot({
    clip: { x: Math.floor(t.x), y: Math.floor(t.y), width: Math.ceil(t.w), height: Math.ceil(t.h) },
  });
  await style.evaluate((el) => el.remove());
  const lum = await luminances(page, png);
  const fg = relLum(t.color);
  return { p95: +ratio(fg, pick(lum, 0.95)).toFixed(2), worst: +ratio(fg, lum[lum.length - 1]).toFixed(2) };
}

test('walkthrough overlay labels meet WCAG AA over the rendered scene', async ({ page }, info) => {
  test.setTimeout(240_000);
  await openReady(page);
  const failures = [];
  for (let ch = 0; ch < CHAPTERS; ch++) {
    await page.evaluate((idx) => window.__tessera.goToChapter(idx), ch);
    await page.waitForTimeout(1200);
    for (const t of await collect(page)) {
      const halo = await measure(page, t, true);
      const bare = await measure(page, t, false);
      const row = { project: info.project.name, chapter: ch + 1, target: t.name, text: t.text, halo, bare };
      console.log(`[contrast] ${JSON.stringify(row)}`);
      if (halo.p95 < AA) failures.push(row);
    }
  }
  expect(failures, 'labels below 4.5:1 (95th-percentile background, with text halo)').toEqual([]);
});
