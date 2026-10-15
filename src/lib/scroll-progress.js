// Maps scroll position inside the story section to a chapter progress value.
// Each chapter gets a hold zone (HOLD of one segment) before its transition starts,
// and the last chapter keeps a hold zone at the end.

export const HOLD = 0.35;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * @param {number} scrollTop  scroll offset measured at the top of the sticky stage
 * @param {number} storyTop   document offset of the story section
 * @param {number} storyHeight height of the story section
 * @param {number} viewportH  height of the sticky stage
 * @param {number} [chapterCount=4]
 * @returns {{progress:number, chapterIndex:number, t:number, active:boolean}}
 */
export function mapScroll(scrollTop, storyTop, storyHeight, viewportH, chapterCount = 4) {
  const n = chapterCount;
  const range = storyHeight - viewportH;
  if (!(range > 0) || n < 2) return { progress: 0, chapterIndex: 0, t: 0, active: false };

  const raw = clamp((scrollTop - storyTop) / range, 0, 1);
  const v = raw * (n - 1 + HOLD);
  const k = Math.floor(v);
  let progress;
  if (k >= n - 1) {
    progress = n - 1;
  } else {
    const f = v - k;
    progress = f < HOLD ? k : k + (f - HOLD) / (1 - HOLD);
  }
  const chapterIndex = Math.min(n - 1, Math.round(progress));
  return { progress, chapterIndex, t: progress - Math.floor(progress), active: true };
}

/**
 * Scroll offset (same frame of reference as mapScroll's scrollTop) that lands in the
 * middle of chapter i's hold zone.
 */
export function chapterScrollTop(i, storyTop, storyHeight, viewportH, chapterCount = 4) {
  const range = storyHeight - viewportH;
  if (!(range > 0) || i <= 0) return storyTop;
  const idx = Math.min(i, chapterCount - 1);
  const raw = (idx + HOLD / 2) / (chapterCount - 1 + HOLD);
  return Math.round(storyTop + raw * range);
}
