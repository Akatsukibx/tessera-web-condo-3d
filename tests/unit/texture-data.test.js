import { describe, it, expect } from 'vitest';
import {
  oakPlanks,
  walnut,
  marble,
  travertine,
  linen,
  boucle,
  concrete,
  brushedMetal,
  woolRug,
  waterNormal,
  contactShadow,
} from '../../src/scene/texture-data.js';

const GENERATORS = {
  oakPlanks,
  walnut,
  marble,
  travertine,
  linen,
  boucle,
  concrete,
  brushedMetal,
  woolRug,
  waterNormal,
  contactShadow,
};

const SIZE = 128;

describe('texture generators', () => {
  for (const [name, gen] of Object.entries(GENERATORS)) {
    describe(name, () => {
      const img = gen(SIZE);

      it('returns w*h*4 RGBA bytes', () => {
        expect(img.width).toBe(SIZE);
        expect(img.height).toBe(SIZE);
        expect(img.data).toBeInstanceOf(Uint8Array);
        expect(img.data.length).toBe(SIZE * SIZE * 4);
      });

      it('is deterministic for the same seed', () => {
        expect(Buffer.from(gen(SIZE).data).equals(Buffer.from(img.data))).toBe(true);
      });

      it('is not a constant image', () => {
        const first = img.data[0];
        expect(img.data.some((v) => v !== first)).toBe(true);
      });
    });
  }

  it('oak roughness (alpha) stays within 0.35..0.8', () => {
    const { data } = oakPlanks(256);
    let min = 255;
    let max = 0;
    for (let i = 3; i < data.length; i += 4) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }
    expect(min).toBeGreaterThanOrEqual(Math.floor(0.35 * 255));
    expect(max).toBeLessThanOrEqual(Math.ceil(0.8 * 255));
    expect(max).toBeGreaterThan(min);
  });

  it('a different seed gives different bytes', () => {
    const a = oakPlanks(SIZE, 1);
    const b = oakPlanks(SIZE, 2);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false);
  });
});
