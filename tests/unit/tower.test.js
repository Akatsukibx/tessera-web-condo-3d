import { describe, it, expect } from 'vitest';
import {
  LEVELS,
  totals,
  typeRange,
  levelArea,
  levelAtHeight,
  bandFor,
  availability,
  describeLevel,
} from '../../src/content/tower.js';
import { PROJECT, UNITS } from '../../src/content/facts.js';

describe('tower zoning', () => {
  it('has 168 residences across 42 storeys with the 1BR/2BR/3BR/PH mix', () => {
    const t = totals();
    expect(t.all).toBe(168);
    expect(PROJECT.residences).toBe(168);
    expect(PROJECT.storeys).toBe(42);
    expect(t).toEqual({ '1br': 64, '2br': 72, '3br': 30, ph: 2, all: 168 });
  });

  it('lists each level 1..42 exactly once', () => {
    expect(LEVELS.map((L) => L.level)).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
  });

  it('labels the lobby, library, podium, wellness, amenity and penthouse levels', () => {
    const kind = (n) => LEVELS[n - 1].kind;
    expect([kind(1), kind(2)]).toEqual(['lobby', 'lobby']);
    expect(kind(3)).toBe('library');
    expect(kind(4)).toBe('podium');
    expect(kind(12)).toBe('wellness');
    expect(kind(38)).toBe('amenity');
    expect([kind(41), kind(42)]).toEqual(['penthouse', 'penthouse']);
    for (const n of [1, 2, 3, 4, 12, 38]) expect(LEVELS[n - 1].units).toEqual([]);
    expect(LEVELS[37].label).toMatch(/Sky lounge/);
    expect(LEVELS[11].label).toMatch(/Wellness/);
    expect(LEVELS[40].label).toMatch(/Penthouse/);
  });

  it('matches UNITS[].floors for every type', () => {
    for (const u of UNITS) {
      const [min, max] = u.floors.split('–').map(Number);
      expect(typeRange(u.id), u.id).toEqual({ min, max });
    }
  });

  it('keeps interior area per level within the floor plate', () => {
    for (const L of LEVELS) {
      expect(levelArea(L.level), `level ${L.level}`).toBeLessThanOrEqual(L.kind === 'penthouse' ? 420 : 504);
    }
  });

  it('has contiguous height bands from 0 to 147.5 m', () => {
    expect(LEVELS[0].y0).toBe(0);
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].y0).toBeCloseTo(LEVELS[i - 1].y1, 6);
    expect(LEVELS[41].y1).toBe(147.5);
    expect(LEVELS[39].y1).toBe(140);
  });

  it('maps heights to levels', () => {
    expect(levelAtHeight(0)).toBe(1);
    expect(levelAtHeight(3.7)).toBe(2);
    expect(levelAtHeight(7.2)).toBe(3);
    expect(levelAtHeight(139.9)).toBe(40);
    expect(levelAtHeight(140.1)).toBe(41);
    expect(levelAtHeight(147.4)).toBe(42);
    expect(levelAtHeight(-1)).toBeNull();
    expect(levelAtHeight(200)).toBeNull();
  });

  it('highlights the lobby and the duplex crown as one band', () => {
    expect(bandFor(1)).toEqual(bandFor(2));
    expect(bandFor(1).y1).toBe(7.2);
    expect(bandFor(41)).toEqual(bandFor(42));
    expect(bandFor(42)).toMatchObject({ y0: 140, y1: 147.5, w: 24, d: 20 });
  });

  it('has deterministic, consistent availability', () => {
    for (const L of LEVELS) {
      const a = availability(L.level);
      expect(availability(L.level)).toEqual(a);
      expect(a.map((x) => x.type)).toEqual(L.units.map((u) => u.type));
      for (const x of a) {
        expect(x.available).toBeGreaterThanOrEqual(0);
        expect(x.available).toBeLessThanOrEqual(x.total);
        expect(x.total).toBe(L.units.find((u) => u.type === x.type).count);
      }
    }
    expect(availability(41)).toEqual([{ type: 'ph', total: 2, available: 1 }]);
  });

  it('describes levels for the tooltip and live region', () => {
    expect(describeLevel(38).tooltip).toContain('Sky lounge');
    expect(describeLevel(12).tooltip).toBe('Level 12 · Wellness floor');
    expect(describeLevel(41).tooltip).toBe('Levels 41–42 · Penthouse duplex · 420 sqm');
    expect(describeLevel(24).tooltip).toBe('Level 24 · 1–3 Bedroom · 58–168 sqm');
    expect(describeLevel(24).short).toBe('Level 24, 5 residences');
    expect(describeLevel(24).announce).toMatch(/^Level 24\. 2 × 1 Bedroom, 2 × 2 Bedroom, 1 × 3 Bedroom\./);
  });
});
