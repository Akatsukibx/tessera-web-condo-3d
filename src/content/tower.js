// Tower zoning: what is on each of the 42 levels, the height band of each level in the 3D model,
// and fictional, seeded availability. Pure data, no DOM and no three, so it is unit-tested.
// Band heights match TOWER in src/scene/sets/exterior.js (lobby 7.2 m, storey 3.5 m,
// body top 140 m, crown top 147.5 m).

import { UNITS, AMENITIES, CHAPTERS } from './facts.js';
import { mulberry32, SCENE_SEED } from '../lib/prng.js';

export const STOREYS = 42;
export const SAMPLE_LEVEL = 34;
const LOBBY_H = 7.2;
const STOREY = 3.5;
const BODY_TOP = 140;
const CROWN_TOP = 147.5;
const BODY = { w: 30, d: 26 };
const CROWN = { w: 24, d: 20 };

const unitById = Object.fromEntries(UNITS.map((u) => [u.id, u]));
const amenity = (title) => AMENITIES.find((a) => a.title === title);

/** Zoning table (see PRODUCT.md "Tower zoning"). */
const ZONES = [
  { from: 1, to: 2, kind: 'lobby', label: 'Lobby, double height', units: [] },
  { from: 3, to: 3, kind: 'library', label: 'Residents’ library', units: [] },
  { from: 4, to: 4, kind: 'podium', label: 'Podium, building services', units: [] },
  { from: 5, to: 11, kind: 'residential', units: [{ type: '1br', count: 3 }, { type: '2br', count: 3 }] },
  { from: 12, to: 12, kind: 'wellness', label: 'Wellness floor', units: [] },
  { from: 13, to: 13, kind: 'residential', units: [{ type: '1br', count: 3 }, { type: '2br', count: 3 }] },
  { from: 14, to: 33, kind: 'residential', units: [{ type: '1br', count: 2 }, { type: '2br', count: 2 }, { type: '3br', count: 1 }] },
  { from: 34, to: 37, kind: 'residential', units: [{ type: '2br', count: 2 }, { type: '3br', count: 1 }] },
  { from: 38, to: 38, kind: 'amenity', label: 'Sky lounge and 35 m infinity pool', units: [] },
  { from: 39, to: 40, kind: 'residential', units: [{ type: '3br', count: 3 }] },
  // Two duplex penthouses span levels 41 and 42. They are listed on both levels and counted once.
  { from: 41, to: 42, kind: 'penthouse', label: 'Penthouse duplex', units: [{ type: 'ph', count: 2 }] },
];

function bandOf(level) {
  if (level <= 2) {
    const h = LOBBY_H / 2;
    return { y0: (level - 1) * h, y1: level * h, ...BODY };
  }
  if (level <= 40) {
    const y0 = LOBBY_H + (level - 3) * STOREY;
    return { y0, y1: Math.min(BODY_TOP, y0 + STOREY), ...BODY };
  }
  const h = (CROWN_TOP - BODY_TOP) / 2;
  return { y0: BODY_TOP + (level - 41) * h, y1: BODY_TOP + (level - 40) * h, ...CROWN };
}

/**
 * @typedef {{type:string,count:number}} LevelUnits
 * @typedef {{level:number,kind:string,label:string,units:LevelUnits[],y0:number,y1:number,w:number,d:number}} Level
 */

/** @type {Level[]} */
export const LEVELS = [];
for (const z of ZONES) {
  for (let level = z.from; level <= z.to; level++) {
    LEVELS.push({ level, kind: z.kind, label: z.label || 'Residential', units: z.units.map((u) => ({ ...u })), ...bandOf(level) });
  }
}
LEVELS.sort((a, b) => a.level - b.level);

export const levelInfo = (level) => LEVELS[level - 1] || null;

/** Level whose band contains height y (metres), or null outside the tower. */
export function levelAtHeight(y) {
  if (!(y >= 0) || y > CROWN_TOP) return null;
  for (const L of LEVELS) if (y >= L.y0 && y < L.y1) return L.level;
  return y === CROWN_TOP ? STOREYS : null;
}

/** Highlight band: levels 1–2 share the lobby, levels 41–42 share the duplex crown. */
export function bandFor(level) {
  const L = levelInfo(level);
  if (!L) return null;
  if (L.kind === 'lobby') return { y0: 0, y1: LOBBY_H, ...BODY };
  if (L.kind === 'penthouse') return { y0: BODY_TOP, y1: CROWN_TOP, ...CROWN };
  return { y0: L.y0, y1: L.y1, w: L.w, d: L.d };
}

/** Residences per type and in total. Penthouses are counted once for the duplex. */
export function totals() {
  const t = { '1br': 0, '2br': 0, '3br': 0, ph: 0, all: 0 };
  for (const L of LEVELS) {
    if (L.kind === 'penthouse' && L.level !== 41) continue;
    for (const u of L.units) {
      t[u.type] += u.count;
      t.all += u.count;
    }
  }
  return t;
}

/** Lowest and highest level a residence type appears on. */
export function typeRange(typeId) {
  const levels = LEVELS.filter((L) => L.units.some((u) => u.type === typeId)).map((L) => L.level);
  return { min: Math.min(...levels), max: Math.max(...levels) };
}

/** Interior area on one level, in sqm. A duplex penthouse counts half its area on each level. */
export function levelArea(level) {
  const L = levelInfo(level);
  if (!L) return 0;
  const share = L.kind === 'penthouse' ? 0.5 : 1;
  return L.units.reduce((s, u) => s + u.count * unitById[u.type].sqm * share, 0);
}

// Fictional availability, seeded so it is the same on every load. Penthouses: 1 of 2 available.
const AVAILABILITY = new Map();
{
  const rand = mulberry32(SCENE_SEED + 500);
  for (const L of LEVELS) {
    if (L.kind === 'penthouse') {
      AVAILABILITY.set(L.level, [{ type: 'ph', total: 2, available: 1 }]);
      continue;
    }
    AVAILABILITY.set(
      L.level,
      L.units.map((u) => {
        let available = 0;
        for (let i = 0; i < u.count; i++) if (rand() >= 0.38) available++;
        return { type: u.type, total: u.count, available };
      }),
    );
  }
}

/** @returns {{type:string,total:number,available:number}[]} */
export function availability(level) {
  return (AVAILABILITY.get(level) || []).map((a) => ({ ...a }));
}

const residenceCount = (L) => L.units.reduce((s, u) => s + u.count, 0);

function bedroomSpan(L) {
  const types = L.units.map((u) => unitById[u.type]);
  const beds = types.map((u) => Number.parseInt(u.label, 10));
  const sqm = types.map((u) => u.sqm);
  const lo = Math.min(...beds);
  const hi = Math.max(...beds);
  const bedLabel = lo === hi ? `${lo} Bedroom` : `${lo}–${hi} Bedroom`;
  const a = Math.min(...sqm);
  const b = Math.max(...sqm);
  return `${bedLabel} · ${a === b ? a : `${a}–${b}`} sqm`;
}

/**
 * Text for the level control, tooltip and live region.
 * @returns {{short:string,tooltip:string,announce:string,title:string,index:string}}
 */
export function describeLevel(level) {
  const L = levelInfo(level);
  if (!L) return { short: '', tooltip: '', announce: '', title: '', index: '' };
  const n = L.level;
  switch (L.kind) {
    case 'lobby':
      return {
        short: `Level ${n}, lobby`,
        tooltip: 'Levels 1–2 · Lobby, double height',
        announce: `Level ${n}. The double-height lobby, 7.2 m.`,
        title: 'Lobby',
        index: 'Levels 1–2',
      };
    case 'library':
      return {
        short: `Level ${n}, residents’ library`,
        tooltip: `Level ${n} · Residents’ library`,
        announce: `Level ${n}. Residents’ library.`,
        title: 'Residents’ library',
        index: `Level ${n}`,
      };
    case 'podium':
      return {
        short: `Level ${n}, podium`,
        tooltip: `Level ${n} · Podium, building services`,
        announce: `Level ${n}. Podium and building services.`,
        title: 'Podium',
        index: `Level ${n}`,
      };
    case 'wellness':
      return {
        short: `Level ${n}, wellness floor`,
        tooltip: `Level ${n} · Wellness floor`,
        announce: `Level ${n}. Wellness floor.`,
        title: 'Wellness floor',
        index: `Level ${n}`,
      };
    case 'amenity':
      return {
        short: `Level ${n}, sky lounge and 35 m pool`,
        tooltip: `Level ${n} · Sky lounge and 35 m pool`,
        announce: `Level ${n}. Sky lounge and 35 m infinity pool.`,
        title: 'Sky lounge and 35 m infinity pool',
        index: `Level ${n}`,
      };
    case 'penthouse': {
      const av = availability(n)[0];
      return {
        short: `Level ${n}, penthouse duplex, 2 residences`,
        tooltip: 'Levels 41–42 · Penthouse duplex · 420 sqm',
        announce: `Level ${n}. 2 duplex penthouses on levels 41 and 42. ${av.available} of ${av.total} available.`,
        title: 'Penthouse duplex, levels 41–42',
        index: 'Levels 41–42',
      };
    }
    default: {
      const count = residenceCount(L);
      const av = availability(n);
      const free = av.reduce((s, a) => s + a.available, 0);
      const mix = L.units.map((u) => `${u.count} × ${unitById[u.type].label}`).join(', ');
      return {
        short: `Level ${n}, ${count} residences`,
        tooltip: `Level ${n} · ${bedroomSpan(L)}`,
        announce: `Level ${n}. ${mix}. ${free === 0 ? 'Sold out on this level' : `${free} of ${count} available`}.`,
        title: `Residences on level ${n}`,
        index: `Level ${n}`,
      };
    }
  }
}

/** Copy for non-residential levels in the panel. */
export function levelCopy(level) {
  const L = levelInfo(level);
  if (!L) return '';
  if (L.kind === 'lobby') return CHAPTERS[1].lede;
  if (L.kind === 'library') return amenity('Residents’ library').copy;
  if (L.kind === 'wellness') return amenity('Wellness floor').copy;
  if (L.kind === 'amenity') return `${amenity('Sky lounge').copy} ${amenity('35 m infinity pool').copy}`;
  if (L.kind === 'podium') return 'Building services and plant. There are no residences on this level.';
  return '';
}

/** Short labels for the level scale, top to bottom. */
export const ZONE_LABELS = [
  { level: 41.5, text: '42–41 Penthouse' },
  { level: 38, text: '38 Sky lounge · Pool' },
  { level: SAMPLE_LEVEL, text: '34 Sample residence' },
  { level: 12, text: '12 Wellness' },
  { level: 3, text: '3 Library' },
  { level: 1.5, text: '1–2 Lobby' },
];
