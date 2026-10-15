// Line elevation of the tower for the Tower Explorer when WebGL is unavailable.
// One <rect class="band"> per level from tower.js, drawn to the same proportions as the 3D model.

import { LEVELS } from '../content/tower.js';

const W = 1600;
const H = 900;
const BASE = 800; // ground line
const K = 4.2; // px per metre
const CX = W / 2;

const f = (n) => n.toFixed(1);

export function towerElevationSvg() {
  const bands = LEVELS.map((L) => {
    const x = CX - (L.w * K) / 2;
    const y = BASE - L.y1 * K;
    const cls = ['band'];
    if (L.kind !== 'residential') cls.push(`band-${L.kind}`);
    return `<rect class="${cls.join(' ')}" data-level="${L.level}" x="${f(x)}" y="${f(y)}" width="${f(L.w * K)}" height="${f((L.y1 - L.y0) * K)}"/>`;
  }).join('');

  // Vertical fins on the body, as fine lines that do not take pointer events.
  const body = LEVELS.find((L) => L.level === 40);
  const lobby = LEVELS.find((L) => L.level === 2);
  let fins = '';
  for (let i = 1; i < 20; i++) {
    const x = CX - (30 * K) / 2 + i * 1.5 * K;
    fins += `M${f(x)} ${f(BASE - body.y1 * K)}V${f(BASE - lobby.y1 * K)}`;
  }

  return `<svg class="tower-elevation" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="elevation-title" xmlns="http://www.w3.org/2000/svg">
<title id="elevation-title">Elevation drawing of the Tessera Sathorn tower, 42 levels. Use the level control to choose a level.</title>
<g class="bands">${bands}</g>
<path class="fins" d="${fins}"/>
<path class="ground" d="M${CX - 260} ${BASE}H${CX + 260}"/>
</svg>`;
}
