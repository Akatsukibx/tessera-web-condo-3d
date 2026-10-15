// Static SVG shown when WebGL is unavailable: a line-drawn tower elevation over a skyline
// silhouette, in paper, ink and olive. Deterministic (seeded) so it renders the same every time.

import { mulberry32, SCENE_SEED } from '../lib/prng.js';

const W = 1600;
const H = 900;
const GROUND = 820;

function skyline() {
  const rand = mulberry32(SCENE_SEED);
  let x = 560;
  let back = '';
  let front = '';
  while (x < W + 40) {
    const w = 34 + Math.floor(rand() * 70);
    const h = 60 + Math.floor(Math.pow(rand(), 1.6) * 300);
    back += `<rect x="${x}" y="${GROUND - h - 40}" width="${w}" height="${h + 40}"/>`;
    x += w + 4 + Math.floor(rand() * 10);
  }
  x = 540;
  while (x < W + 40) {
    const w = 40 + Math.floor(rand() * 80);
    const h = 30 + Math.floor(Math.pow(rand(), 2) * 200);
    // keep the tower plot clear
    if (x + w > 1040 && x < 1260) {
      x = 1262;
      continue;
    }
    front += `<rect x="${x}" y="${GROUND - h}" width="${w}" height="${h}"/>`;
    x += w + 6 + Math.floor(rand() * 14);
  }
  return { back, front };
}

function tower() {
  const left = 1060;
  const width = 180;
  const crownInset = 26;
  const top = 120;
  const crownTop = top;
  const bodyTop = top + 46;
  const storey = (GROUND - bodyTop) / 40;
  let floors = '';
  for (let i = 1; i < 40; i++) {
    const y = (bodyTop + i * storey).toFixed(1);
    floors += `<path d="M${left} ${y}h${width}"/>`;
  }
  let fins = '';
  for (let fx = left + 10; fx < left + width; fx += 10) {
    fins += `<path d="M${fx} ${bodyTop}V${GROUND - 34}"/>`;
  }
  // Level 34 sits 8 storeys below the top of the body
  const l34y = bodyTop + 6 * storey;
  return `
<g fill="#F4F1EA" stroke="#1A1A17" stroke-width="2">
  <rect x="${left + crownInset}" y="${crownTop}" width="${width - 2 * crownInset}" height="${bodyTop - crownTop}"/>
  <rect x="${left}" y="${bodyTop}" width="${width}" height="${GROUND - bodyTop}"/>
</g>
<g stroke="#CFC9BC" stroke-width="1">${floors}</g>
<g stroke="#4A4A43" stroke-width="1">${fins}</g>
<rect x="${left + 60}" y="${(l34y).toFixed(1)}" width="40" height="${storey.toFixed(1)}" fill="#4F5A2A"/>
<rect x="${left + 50}" y="${GROUND - 34}" width="${width - 100}" height="34" fill="#EAE6DC" stroke="#1A1A17" stroke-width="2"/>
<g stroke="#1A1A17" stroke-width="1" fill="none">
  <path d="M${left + 100} ${(l34y + storey / 2).toFixed(1)}H${left + width + 60}"/>
  <path d="M${left + width + 190} ${crownTop}V${GROUND}M${left + width + 182} ${crownTop}h16M${left + width + 182} ${GROUND}h16"/>
</g>
<g font-family="'IBM Plex Mono', monospace" font-size="16" letter-spacing="1.5" fill="#1A1A17">
  <text x="${left + width + 68}" y="${(l34y + storey / 2 + 5).toFixed(1)}">LEVEL 34</text>
  <text x="${left + width + 210}" y="${(crownTop + GROUND) / 2}" transform="rotate(-90 ${left + width + 210} ${(crownTop + GROUND) / 2})" text-anchor="middle">148 M</text>
</g>`;
}

export function fallbackSvg() {
  const { back, front } = skyline();
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Line drawing of the Tessera Sathorn tower above the Sathorn skyline at dusk" aria-describedby="story-desc" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#EAE6DC"/>
<circle cx="800" cy="250" r="56" fill="none" stroke="#4F5A2A" stroke-width="1.5"/>
<g fill="#DCD7CB">${back}</g>
<g fill="#CFC9BC">${front}</g>
${tower()}
<path d="M0 ${GROUND}H${W}" stroke="#1A1A17" stroke-width="2"/>
<rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="#F4F1EA"/>
<g font-family="'IBM Plex Mono', monospace" font-size="14" letter-spacing="1.5" fill="#4A4A43">
  <text x="1060" y="${GROUND + 34}">SOUTH ELEVATION · SATHORN ROAD</text>
</g>
</svg>`;
}

/** Replaces the canvas with the static fallback. */
export function renderFallback(canvas) {
  const wrap = document.createElement('div');
  wrap.className = 'scene-fallback';
  wrap.innerHTML = fallbackSvg();
  canvas.replaceWith(wrap);
  return wrap;
}
