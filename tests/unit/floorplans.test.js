import { describe, it, expect } from 'vitest';
import { UNITS } from '../../src/content/facts.js';
import { floorPlanSvg, totalRoomArea, PLANS, fitLabel } from '../../src/ui/floorplans.js';

describe('floor plans', () => {
  for (const unit of UNITS) {
    it(`${unit.label}: has a title and rooms that add up to ${unit.sqm} sqm (±10%)`, () => {
      const svg = floorPlanSvg(unit.id);
      expect(svg).toContain('role="img"');
      expect(svg).toMatch(new RegExp(`<title[^>]*>${unit.label} floor plan, ${unit.sqm} sqm</title>`));
      const total = totalRoomArea(unit.id);
      expect(Math.abs(total - unit.sqm) / unit.sqm).toBeLessThanOrEqual(0.1);
    });
  }

  it('draws the penthouse as two levels', () => {
    expect(PLANS.ph).toHaveLength(2);
    expect(floorPlanSvg('ph')).toContain('LEVEL 41');
    expect(floorPlanSvg('ph')).toContain('LEVEL 42');
  });

  it('crops to the drawing in fit mode, with its own title id', () => {
    for (const unit of UNITS) {
      const svg = floorPlanSvg(unit.id, 'panel-plan-title-', { fit: true });
      expect(svg).toContain(`<title id="panel-plan-title-${unit.id}">`);
      expect(svg).not.toContain('NaN');
      const [, , w] = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
      // Drawing width plus a 10-unit margin each side; never wider than the full view + margins.
      expect(w).toBeLessThanOrEqual(300 + 20);
      if (unit.id !== 'ph') expect(w).toBeLessThan(300);
    }
  });

  it('fits every room label inside its room', () => {
    for (const levels of Object.values(PLANS)) {
      for (const r of levels.flatMap((l) => l.rooms)) {
        const w = r.w * 8;
        const h = r.h * 8;
        const { lines, rotate, size } = fitLabel(r.name, 'x.x', w, h);
        const longest = Math.max(...lines.map((l) => l.length)) * size * 0.6;
        const block = (lines.length - 1) * size * 1.3 + size;
        expect(longest).toBeLessThanOrEqual((rotate ? h : w) - 2);
        expect(block).toBeLessThanOrEqual((rotate ? w : h) - 2);
        expect(size).toBeGreaterThanOrEqual(3.5);
      }
    }
  });

  it('marks a 2.4 m balcony on the 2 Bedroom plan', () => {
    expect(PLANS['2br'][0].balcony.w).toBe(2.4);
  });
});
