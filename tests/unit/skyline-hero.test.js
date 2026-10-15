import { describe, it, expect } from 'vitest';
import { placeBlocks, heroCap, C1 } from '../../src/scene/sets/skyline.js';
import { mulberry32, SCENE_SEED } from '../../src/lib/prng.js';

describe('skyline keeps Tessera Sathorn dominant in chapter 1', () => {
  const blocks = placeBlocks(mulberry32(SCENE_SEED));
  const towerAngle = Math.atan(146.3 / 126.2); // tower top seen from the street camera

  it('keeps every block below 60 % of the tower elevation angle from the street camera', () => {
    for (const b of blocks) {
      const dist = Math.max(1, Math.hypot(b.x - C1.x, b.z - C1.z) - 0.5 * Math.hypot(b.w, b.d));
      const angle = Math.atan((b.h - 1.7) / dist);
      expect(angle).toBeLessThanOrEqual(0.6 * towerAngle + 1e-9);
    }
  });

  it('keeps blocks within 600 m of the tower at or below 88 m', () => {
    const near = blocks.filter((b) => Math.hypot(b.x, b.z) < 600);
    expect(near.length).toBeGreaterThan(50);
    for (const b of near) expect(b.h).toBeLessThanOrEqual(88);
  });

  it('heroCap is pure', () => {
    expect(heroCap(300, 300, 20, 20)).toBe(heroCap(300, 300, 20, 20));
    expect(heroCap(0, 400, 20, 20)).toBeLessThanOrEqual(88);
  });
});
