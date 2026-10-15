// Hand-built SVG floor plans. Rooms are rectangles in metres (x east, y south, north up,
// west to the left). Every plan shares one scale: 1 m = 8 SVG units.

import { UNITS } from '../content/facts.js';

export const SCALE = 8;
const VIEW_W = 300;
const VIEW_H = 184;
const PLAN_TOP = 16;
const PLAN_BOTTOM = 146;
const FONT = 5;

/** @typedef {{name:string, x:number, y:number, w:number, h:number}} Room */
/** @typedef {{title:string, w:number, h:number, rooms:Room[], balcony:{x:number,y:number,w:number,h:number}}} Level */

/** @type {Record<string, Level[]>} */
export const PLANS = {
  '1br': [
    {
      title: '',
      w: 9.5,
      h: 6.1,
      balcony: { x: -1.6, y: 0, w: 1.6, h: 4.1 },
      rooms: [
        { name: 'Living', x: 0, y: 0, w: 5.5, h: 4.1 },
        { name: 'Kitchen', x: 0, y: 4.1, w: 5.5, h: 2.0 },
        { name: 'Bedroom', x: 5.5, y: 0, w: 4, h: 3.6 },
        { name: 'Bath', x: 5.5, y: 3.6, w: 2.5, h: 2.5 },
        { name: 'Entry', x: 8, y: 3.6, w: 1.5, h: 2.5 },
      ],
    },
  ],
  '2br': [
    {
      title: '',
      w: 12,
      h: 8,
      balcony: { x: -2.4, y: 0, w: 2.4, h: 5 },
      rooms: [
        { name: 'Living', x: 0, y: 0, w: 6, h: 5 },
        { name: 'Kitchen', x: 0, y: 5, w: 3.5, h: 3 },
        { name: 'Entry', x: 3.5, y: 5, w: 2.5, h: 3 },
        { name: 'Bedroom', x: 6, y: 0, w: 4, h: 4 },
        { name: 'Ensuite', x: 10, y: 0, w: 2, h: 4 },
        { name: 'Bedroom 2', x: 6, y: 4, w: 3.5, h: 4 },
        { name: 'Bath', x: 9.5, y: 4, w: 2.5, h: 4 },
      ],
    },
  ],
  '3br': [
    {
      title: '',
      w: 14,
      h: 12,
      balcony: { x: -2.4, y: 0, w: 2.4, h: 6 },
      rooms: [
        { name: 'Living', x: 0, y: 0, w: 7, h: 6 },
        { name: 'Kitchen', x: 0, y: 6, w: 4, h: 4 },
        { name: 'Lift lobby', x: 0, y: 10, w: 4, h: 2 },
        { name: 'Gallery', x: 4, y: 6, w: 3, h: 6 },
        { name: 'Bedroom', x: 7, y: 0, w: 5, h: 5 },
        { name: 'Ensuite', x: 12, y: 0, w: 2, h: 5 },
        { name: 'Bedroom 2', x: 7, y: 5, w: 4.5, h: 4 },
        { name: 'Bath', x: 11.5, y: 5, w: 2.5, h: 4 },
        { name: 'Bedroom 3', x: 7, y: 9, w: 4.5, h: 3 },
        { name: 'Utility', x: 11.5, y: 9, w: 2.5, h: 3 },
      ],
    },
  ],
  ph: [
    {
      title: 'Level 41',
      w: 15,
      h: 14,
      balcony: { x: -2.4, y: 0, w: 2.4, h: 8 },
      rooms: [
        { name: 'Living', x: 0, y: 0, w: 9, h: 8 },
        { name: 'Dining', x: 9, y: 0, w: 6, h: 8 },
        { name: 'Kitchen', x: 0, y: 8, w: 6, h: 6 },
        { name: 'Lift lobby', x: 6, y: 8, w: 3, h: 3 },
        { name: 'Stair', x: 6, y: 11, w: 3, h: 3 },
        { name: 'Guest room', x: 9, y: 8, w: 4, h: 6 },
        { name: 'Bath', x: 13, y: 8, w: 2, h: 6 },
      ],
    },
    {
      title: 'Level 42',
      w: 15,
      h: 14,
      balcony: { x: -2.4, y: 0, w: 2.4, h: 8 },
      rooms: [
        { name: 'Bedroom', x: 0, y: 0, w: 8, h: 8 },
        { name: 'Dressing', x: 8, y: 0, w: 3, h: 8 },
        { name: 'Ensuite', x: 11, y: 0, w: 4, h: 8 },
        { name: 'Bedroom 2', x: 0, y: 8, w: 6, h: 6 },
        { name: 'Study', x: 6, y: 8, w: 3, h: 3 },
        { name: 'Stair', x: 6, y: 11, w: 3, h: 3 },
        { name: 'Bedroom 3', x: 9, y: 8, w: 4, h: 6 },
        { name: 'Bath', x: 13, y: 8, w: 2, h: 6 },
      ],
    },
  ],
};

export const roomArea = (r) => Math.round(r.w * r.h * 100) / 100;
const fmtArea = (a) => (Number.isInteger(a) ? String(a) : a.toFixed(1));

/** Total interior room area in sqm (balconies excluded). */
export function totalRoomArea(id) {
  return PLANS[id].reduce((sum, lvl) => sum + lvl.rooms.reduce((s, r) => s + r.w * r.h, 0), 0);
}

const charW = FONT * 0.6;

function labelLines(name, widthPx) {
  if (name.length * charW + 3 <= widthPx || !name.includes(' ')) return [name];
  return name.split(' ');
}

const LABEL_PAD = 3;

/**
 * Picks how a room label fits inside its rectangle: horizontal at full size when it fits,
 * otherwise whichever of horizontal or rotated (reading bottom-up) needs the least shrinking.
 * @returns {{lines:string[], rotate:boolean, size:number}}
 */
export function fitLabel(name, area, w, h) {
  let best = null;
  for (const rotate of [false, true]) {
    const along = rotate ? h : w;
    const across = rotate ? w : h;
    const lines = [...labelLines(name, along), `${area} sqm`];
    const longest = Math.max(...lines.map((l) => l.length)) * charW;
    const block = (lines.length - 1) * FONT * 1.3 + FONT;
    const s = Math.min(1, (along - LABEL_PAD) / longest, (across - LABEL_PAD) / block);
    if (!best || s > best.s + 1e-6) best = { lines, rotate, s };
  }
  return { lines: best.lines, rotate: best.rotate, size: +(FONT * best.s).toFixed(2) };
}

function roomSvg(r, ox, oy) {
  const x = ox + r.x * SCALE;
  const y = oy + r.y * SCALE;
  const w = r.w * SCALE;
  const h = r.h * SCALE;
  const { lines, rotate, size } = fitLabel(r.name, fmtArea(roomArea(r)), w, h);
  const cx = x + w / 2;
  const lh = size * 1.3;
  const cy = y + h / 2 - ((lines.length - 1) * lh) / 2 + size * 0.35;
  const style = size < FONT ? ` style="font-size:${size}px"` : '';
  const text = lines
    .map(
      (line, i) =>
        `<text x="${cx}" y="${(cy + i * lh).toFixed(2)}" class="${i === lines.length - 1 ? 'pa' : 'pn'}"${style}>${line}</text>`,
    )
    .join('');
  const label = rotate ? `<g transform="rotate(-90 ${cx} ${y + h / 2})">${text}</g>` : text;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="pw"/>${label}`;
}

function levelSvg(level, ox, oy) {
  const b = level.balcony;
  const bx = ox + b.x * SCALE;
  const by = oy + b.y * SCALE;
  const bw = b.w * SCALE;
  const bh = b.h * SCALE;
  const balcony =
    `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" class="pb"/>` +
    `<text x="${bx + bw / 2}" y="${by + bh / 2}" class="pbl" transform="rotate(-90 ${bx + bw / 2} ${by + bh / 2})">Balcony</text>`;
  const rooms = level.rooms.map((r) => roomSvg(r, ox, oy)).join('');
  const outline = `<rect x="${ox}" y="${oy}" width="${level.w * SCALE}" height="${level.h * SCALE}" class="po"/>`;
  const title = level.title
    ? `<text x="${bx}" y="${oy - 6}" class="pt">${level.title.toUpperCase()}</text>`
    : '';
  return balcony + rooms + outline + title;
}

/**
 * Builds the floor plan SVG for a unit id.
 * @param {string} id
 * @returns {string}
 */
export function floorPlanSvg(id, idPrefix = 'plan-title-', { fit = false } = {}) {
  const unit = UNITS.find((u) => u.id === id);
  const levels = PLANS[id];
  const gap = 2 * SCALE;
  const widths = levels.map((l) => (l.w - l.balcony.x) * SCALE);
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (levels.length - 1);
  const maxH = Math.max(...levels.map((l) => l.h * SCALE));
  let cursor = (VIEW_W - totalW) / 2;
  const oy = PLAN_TOP + (PLAN_BOTTOM - PLAN_TOP - maxH) / 2;
  const drawn = levels
    .map((l, i) => {
      const ox = cursor - l.balcony.x * SCALE;
      cursor += widths[i] + gap;
      return levelSvg(l, ox, oy);
    })
    .join('');

  // `fit` crops the view to the drawing (used in the narrow explorer panel); the scale is unchanged.
  let view = [0, 0, VIEW_W, VIEW_H];
  if (fit) {
    const x0 = (VIEW_W - totalW) / 2 - 10;
    const y0 = oy - 14;
    const w = Math.max(totalW + 20, 5 * SCALE + 60);
    view = [x0, y0, w, maxH + 40];
  }
  // 5 m scale bar and north arrow along the bottom strip
  const sbX = fit ? view[0] + 8 : 8;
  const sbY = fit ? view[1] + view[3] - 8 : 168;
  const five = 5 * SCALE;
  const scaleBar =
    `<path d="M${sbX} ${sbY}h${five}M${sbX} ${sbY - 3}v6M${sbX + five / 2} ${sbY - 2}v4M${sbX + five} ${sbY - 3}v6" class="ps"/>` +
    `<text x="${sbX + five + 5}" y="${sbY + 1.8}" class="pk">5 m</text>`;
  const nx = fit ? view[0] + view[2] - 12 : VIEW_W - 12;
  const north =
    `<path d="M${nx} ${sbY + 5}V${sbY - 9}M${nx - 3.5} ${sbY - 5}L${nx} ${sbY - 9}L${nx + 3.5} ${sbY - 5}" class="ps"/>` +
    `<text x="${nx - 9}" y="${sbY + 1.8}" class="pk">N</text>`;

  const title = `${unit.label} floor plan, ${unit.sqm} sqm`;
  return (
    `<svg viewBox="${view.map((n) => +n.toFixed(2)).join(' ')}" role="img" aria-labelledby="${idPrefix}${id}" xmlns="http://www.w3.org/2000/svg">` +
    `<title id="${idPrefix}${id}">${title}</title>` +
    '<style>' +
    '.pw{fill:#F4F1EA;stroke:#1A1A17;stroke-width:0.9}' +
    '.po{fill:none;stroke:#1A1A17;stroke-width:1.8}' +
    '.pb{fill:#DADDC8;stroke:#4F5A2A;stroke-width:0.9}' +
    `.pn,.pa,.pbl,.pt,.pk{font-family:'IBM Plex Mono',monospace;font-size:${FONT}px;text-anchor:middle}` +
    '.pn{fill:#1A1A17}.pa{fill:#4A4A43}.pbl{fill:#3B4420;dominant-baseline:middle}' +
    '.pt{text-anchor:start;fill:#1A1A17;letter-spacing:.4px}.pk{fill:#4A4A43;text-anchor:start}' +
    '.ps{fill:none;stroke:#1A1A17;stroke-width:0.8}' +
    '</style>' +
    drawn +
    scaleBar +
    north +
    '</svg>'
  );
}
