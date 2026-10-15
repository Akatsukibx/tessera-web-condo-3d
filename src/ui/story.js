// Story section: full-bleed chapter overlay, chapter rail, scroll mapping and the test hook.

import { CHAPTERS, PROJECT } from '../content/facts.js';
import { mapScroll, chapterScrollTop } from '../lib/scroll-progress.js';
import { createChapterNav } from './chapter-nav.js';

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * Chapter 1 is the hero intro: the project title appears once, as the page h1.
 * Chapters 2–4 carry their own h2. Each article holds its title block and its spec row.
 */
function renderChapters(container) {
  const total = pad(CHAPTERS.length);
  container.innerHTML = CHAPTERS.map((c, i) => {
    const first = i === 0;
    const titleId = first ? 'story-title' : `chapter-${c.id}-title`;
    const label = first ? `${pad(1)} / ${total} · ${esc(c.title)}` : `${pad(i + 1)} / ${total}`;
    const heading = first
      ? `<h1 id="${titleId}" class="chapter-title">${esc(PROJECT.name)}</h1>`
      : `<h2 id="${titleId}" class="chapter-title">${esc(c.title)}</h2>`;
    return `<article class="chapter${first ? ' chapter-intro' : ''}" id="chapter-${c.id}" aria-labelledby="${titleId}"${first ? '' : ' hidden'}>
  <div class="chapter-head">
    <p class="index-label">${label}</p>
    ${heading}
    <p class="chapter-lede">${esc(c.lede)}</p>
  </div>
  <dl class="specs">${c.specs.map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl>
</article>`;
  }).join('');
  return [...container.querySelectorAll('.chapter')];
}

/**
 * @param {{scene: null | {setProgress(p:number):void, jumpTo(p:number):void, info():object}, reducedMotion: MediaQueryList}} opts
 * @returns {{goTo:(index:number, o?:{instant?:boolean}) => void, buttons: HTMLButtonElement[]}}
 */
export function initStory({ scene, reducedMotion }) {
  const story = document.getElementById('story');
  const stage = story.querySelector('.story-stage');
  const desc = document.getElementById('story-desc');
  const live = document.getElementById('story-live');
  const articles = renderChapters(document.getElementById('chapters'));

  let current = -1;
  let lockUntil = 0;
  let lockedIndex = -1;

  const setChapter = (index, announce) => {
    if (index === current) return;
    current = index;
    articles.forEach((a, i) => (a.hidden = i !== index));
    nav.setActive(index);
    desc.textContent = CHAPTERS[index].description;
    if (announce) live.textContent = `Chapter ${index + 1} of ${CHAPTERS.length}: ${CHAPTERS[index].title}`;
  };

  const setRailProgress = (p) => story.style.setProperty('--story-progress', (p / (CHAPTERS.length - 1)).toFixed(4));

  // The stage sticks at the top of the viewport (the header floats over it), so no header offset.
  const metrics = () => {
    const storyTop = story.getBoundingClientRect().top + window.scrollY;
    return { storyTop, storyHeight: story.offsetHeight, stageH: stage.offsetHeight };
  };

  const scrollTargetFor = (index) => {
    const m = metrics();
    return chapterScrollTop(index, m.storyTop, m.storyHeight, m.stageH, CHAPTERS.length);
  };

  const goTo = (index, { instant = false } = {}) => {
    const i = Math.max(0, Math.min(CHAPTERS.length - 1, index));
    const m = metrics();
    const scrollable = m.storyHeight - m.stageH > 0;
    lockedIndex = i;
    lockUntil = performance.now() + (instant ? 150 : 1500);
    setChapter(i, true);
    if (scrollable) {
      const behavior = instant || reducedMotion.matches ? 'instant' : 'smooth';
      window.scrollTo({ top: Math.max(0, scrollTargetFor(i)), behavior });
    } else {
      setRailProgress(i);
    }
    if (scene) {
      if (instant || reducedMotion.matches || !scrollable) scene.jumpTo(i);
      else scene.setProgress(i);
    }
  };

  const nav = createChapterNav(document.getElementById('chapter-buttons'), CHAPTERS, (i) => goTo(i));

  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const m = metrics();
    const r = mapScroll(window.scrollY, m.storyTop, m.storyHeight, m.stageH, CHAPTERS.length);
    if (!r.active) return; // single-column layout: chapters change by button only
    setRailProgress(r.progress);
    if (scene) scene.setProgress(r.progress);
    const locked = performance.now() < lockUntil;
    setChapter(locked ? lockedIndex : r.chapterIndex, !locked);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  window.addEventListener('scrollend', () => {
    lockUntil = 0;
  });
  window.addEventListener('resize', () => requestAnimationFrame(onScroll));

  setChapter(0, false);
  setRailProgress(0);
  onScroll();

  window.__tessera = {
    goToChapter(i) {
      goTo(i, { instant: true });
    },
    get chapter() {
      return current;
    },
    renderInfo() {
      return scene ? scene.info() : null;
    },
  };

  return { goTo, buttons: nav.buttons };
}
