import { describe, it, expect } from 'vitest';
import { placeBlocks } from '../../src/scene/sets/skyline.js';
import { mulberry32, SCENE_SEED } from '../../src/lib/prng.js';

describe('skyline sightline to the river', () => {
  const blocks = placeBlocks(mulberry32(SCENE_SEED));

  it('places enough blocks for a full skyline', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(600);
  });

  it('keeps every block in the west wedge below the balcony sightline', () => {
    const wedge = blocks.filter((b) => b.x < -100 && Math.abs(b.z) < 0.5 * Math.abs(b.x));
    expect(wedge.length).toBeGreaterThan(0);
    for (const b of wedge) {
      const d = Math.hypot(b.x, b.z);
      expect(d).toBeLessThanOrEqual(540);
      expect(b.h).toBeLessThanOrEqual(Math.max(8, 96 * (1 - d / 600)) + 1e-9);
    }
  });

  it('is deterministic and uses both building variants', () => {
    const again = placeBlocks(mulberry32(SCENE_SEED));
    expect(again).toEqual(blocks);
    expect(new Set(blocks.map((b) => b.variant))).toEqual(new Set([0, 1]));
  });
});
