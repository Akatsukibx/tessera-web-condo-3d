import { describe, it, expect } from 'vitest';
import { towerElevationSvg } from '../../src/ui/tower-elevation.js';

describe('tower elevation SVG (no-WebGL explorer)', () => {
  const svg = towerElevationSvg();

  it('is a labelled image', () => {
    expect(svg).toMatch(/role="img"/);
    expect(svg).toMatch(/<title id="elevation-title">[^<]+<\/title>/);
  });

  it('has exactly one band per level, 1..42', () => {
    const levels = [...svg.matchAll(/class="band[^"]*" data-level="(\d+)"/g)].map((m) => Number(m[1]));
    expect(levels).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
  });

  it('has no NaN', () => {
    expect(svg).not.toContain('NaN');
  });
});
