import { describe, it, expect } from 'vitest';
import { mapScroll, chapterScrollTop, HOLD } from '../../src/lib/scroll-progress.js';

const TOP = 72;
const STORY_H = 3600;
const VIEW_H = 828;
const RANGE = STORY_H - VIEW_H;

describe('mapScroll', () => {
  it('starts at chapter 0 before and at the story top', () => {
    expect(mapScroll(0, TOP, STORY_H, VIEW_H)).toMatchObject({ progress: 0, chapterIndex: 0, active: true });
    expect(mapScroll(TOP, TOP, STORY_H, VIEW_H).progress).toBe(0);
  });

  it('ends at the last chapter', () => {
    expect(mapScroll(TOP + RANGE, TOP, STORY_H, VIEW_H)).toMatchObject({ progress: 3, chapterIndex: 3 });
    expect(mapScroll(99999, TOP, STORY_H, VIEW_H).progress).toBe(3);
  });

  it('holds each chapter for the hold zone before transitioning', () => {
    const seg = RANGE / (3 + HOLD);
    expect(mapScroll(TOP + seg * 1 + seg * HOLD * 0.9, TOP, STORY_H, VIEW_H).progress).toBe(1);
    const mid = mapScroll(TOP + seg * 1 + seg * (HOLD + (1 - HOLD) / 2), TOP, STORY_H, VIEW_H);
    expect(mid.progress).toBeCloseTo(1.5, 5);
    expect(mid.t).toBeCloseTo(0.5, 5);
  });

  it('is monotonic', () => {
    let prev = -1;
    for (let s = 0; s <= STORY_H; s += 25) {
      const { progress } = mapScroll(s, TOP, STORY_H, VIEW_H);
      expect(progress).toBeGreaterThanOrEqual(prev);
      prev = progress;
    }
  });

  it('is inactive when the story does not scroll', () => {
    expect(mapScroll(100, TOP, 500, 800).active).toBe(false);
  });
});

describe('chapterScrollTop', () => {
  it('lands inside each chapter hold zone', () => {
    for (let i = 0; i < 4; i++) {
      const top = chapterScrollTop(i, TOP, STORY_H, VIEW_H);
      const r = mapScroll(top, TOP, STORY_H, VIEW_H);
      expect(r.progress).toBe(i);
      expect(r.chapterIndex).toBe(i);
    }
  });
});
