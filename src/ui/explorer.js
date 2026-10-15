// Tower Explorer: choose a level on the 3D tower (or the SVG elevation without WebGL), see its
// residences, areas, prices and availability in one side panel, and book a viewing for it.

import { UNITS } from '../content/facts.js';
import {
  STOREYS,
  SAMPLE_LEVEL,
  ZONE_LABELS,
  totals,
  describeLevel,
  availability,
  levelInfo,
  levelCopy,
} from '../content/tower.js';
import { floorPlanSvg } from './floorplans.js';
import { towerElevationSvg } from './tower-elevation.js';
import { selectUnit } from './booking-form.js';
import { icon } from './icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const unitById = Object.fromEntries(UNITS.map((u) => [u.id, u]));
const priceText = (u) => (u.priceLabel === 'Price on request' ? u.priceLabel : `From ${u.priceLabel}`);

const STORY_LABEL = '3D walkthrough of a Tessera Sathorn residence';
const EXPLORER_LABEL = '3D model of the Tessera Sathorn tower. Use the level control to choose a level.';
const DRAG_PX = 4;
const DEG_PER_PX = 0.25;
const IDLE_MS = 4000;

function mixHtml() {
  const t = totals();
  const rows = UNITS.map((u) => `<div><dt>${esc(u.label)}</dt><dd>${t[u.id]}</dd></div>`).join('');
  return `${rows}<div class="mix-total"><dt>Total</dt><dd>${t.all}</dd></div>`;
}

function zoneLabelsHtml() {
  return ZONE_LABELS.map(
    (z) => `<li style="--p:${((z.level - 1) / (STOREYS - 1)).toFixed(4)}">${esc(z.text)}</li>`,
  ).join('');
}

/** Panel body for one level. `planType` is the type whose plan is shown. */
function panelHtml(level, planType) {
  const L = levelInfo(level);
  const d = describeLevel(level);
  const head = `<p class="index-label">${esc(d.index)}</p>
<h3 id="floor-panel-title" tabindex="-1">${esc(d.title)}</h3>`;
  const book = `<button type="button" class="btn btn-primary" id="panel-book">${
    L.units.length ? 'Book a viewing for this residence' : 'Book a viewing'
  }</button>`;

  if (L.units.length === 0) {
    const extra =
      L.kind === 'lobby'
        ? `<button type="button" class="btn btn-secondary" id="panel-lobby">See the lobby</button>`
        : '';
    return `${head}
<p class="panel-copy">${esc(levelCopy(level))}</p>
<p class="panel-note">No residences on this level.</p>
<div class="panel-actions">${book}${extra}</div>`;
  }

  const av = availability(level);
  const rows = av
    .map((a) => {
      const u = unitById[a.type];
      const status = a.available === 0 ? 'Sold out' : `${a.available} of ${a.total} available`;
      return `<div><dt>${esc(u.label)}</dt><dd class="n">${u.sqm} sqm</dd><dd class="n">${esc(priceText(u))}</dd><dd class="n status">${status}</dd></div>`;
    })
    .join('');
  const free = av.reduce((s, a) => s + a.available, 0);
  const all = av.reduce((s, a) => s + a.total, 0);
  const summary = free === 0 ? 'Sold out on this level' : `${free} of ${all} available on this level`;

  const types = L.units.map((u) => u.type);
  const switcher =
    types.length > 1
      ? `<div class="plan-switch" role="group" aria-label="Floor plan">${types
          .map(
            (t) =>
              `<button type="button" data-type="${t}" aria-pressed="${t === planType}">${esc(unitById[t].label)}</button>`,
          )
          .join('')}</div>`
      : '';

  const notes = [];
  if (types.includes('3br') || types.includes('ph')) notes.push('Private lift lobby for 3 Bedroom and Penthouse residences.');
  if (types.includes('ph')) notes.push('Each penthouse is a duplex across levels 41 and 42.');
  if (level === SAMPLE_LEVEL) notes.push('This is the level of the sample residence in the walkthrough.');

  return `${head}
<p class="panel-summary">${summary}</p>
<dl class="floor-units">${rows}</dl>
${switcher}
<figure class="panel-plan">${floorPlanSvg(planType, 'panel-plan-title-', { fit: true })}</figure>
${notes.map((n) => `<p class="panel-note">${esc(n)}</p>`).join('')}
<div class="panel-actions">${book}</div>`;
}

/**
 * @param {{scene: any, story: {goTo:(i:number)=>void, buttons:HTMLButtonElement[]}, reducedMotion: MediaQueryList}} opts
 */
export function initExplorer({ scene, story, reducedMotion }) {
  const root = document.getElementById('explorer');
  if (!root) return;
  const host = document.getElementById('explorer-scene');
  const storyEl = document.getElementById('story');
  const storyHost = document.getElementById('scene');
  const range = /** @type {HTMLInputElement} */ (document.getElementById('floor-range'));
  const readout = document.getElementById('floor-readout-text');
  const openBtn = document.getElementById('floor-open');
  const live = document.getElementById('floor-live');
  const tip = root.querySelector('.floor-tip');
  const panel = document.getElementById('floor-panel');
  const panelBody = document.getElementById('floor-panel-body');
  const closeBtn = panel.querySelector('.panel-close');

  document.getElementById('explorer-mix').innerHTML = mixHtml();
  document.getElementById('zone-labels').innerHTML = zoneLabelsHtml();
  closeBtn.innerHTML = icon('close');

  let level = Number(range.value) || 24;
  let hover = null;
  let openLevel = null;
  let planType = '';
  let returnFocus = null;
  let svgBands = null; // ?nowebgl only

  // ---------- Highlight + readout ----------
  const paintSvg = () => {
    if (!svgBands) return;
    const same = (a, b) => {
      if (a == null || b == null) return false;
      const A = levelInfo(a);
      const B = levelInfo(b);
      return a === b || (A.kind === B.kind && (A.kind === 'lobby' || A.kind === 'penthouse'));
    };
    svgBands.forEach((rect) => {
      const n = Number(rect.dataset.level);
      rect.classList.toggle('is-selected', same(n, level));
      rect.classList.toggle('is-hover', !same(n, level) && same(n, hover));
    });
  };
  const paint = () => {
    if (scene) scene.setHighlight({ hover, selected: level });
    paintSvg();
  };

  const selectLevel = (n, { announce = true } = {}) => {
    level = Math.max(1, Math.min(STOREYS, Math.round(n)));
    const d = describeLevel(level);
    range.value = String(level);
    range.setAttribute('aria-valuetext', d.short);
    const L = levelInfo(level);
    const count = L.kind === 'penthouse' ? 2 : L.units.reduce((s, u) => s + u.count, 0);
    readout.textContent = count ? `Level ${level} · ${count} residences` : d.tooltip;
    openBtn.textContent = `View level ${level}`;
    if (announce) live.textContent = d.announce;
    paint();
  };

  // ---------- Panel ----------
  const bindPanel = () => {
    panelBody.querySelectorAll('.plan-switch button').forEach((b) =>
      b.addEventListener('click', () => {
        planType = b.dataset.type;
        panelBody.querySelectorAll('.plan-switch button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        panelBody.querySelector('.panel-plan').innerHTML = floorPlanSvg(planType, 'panel-plan-title-', { fit: true });
      }),
    );
    panelBody.querySelector('#panel-book').addEventListener('click', () => {
      close({ restore: false });
      selectUnit(planType);
      const booking = document.getElementById('booking');
      booking.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
      document.getElementById('f-name').focus({ preventScroll: true });
    });
    const lobbyBtn = panelBody.querySelector('#panel-lobby');
    if (lobbyBtn) {
      lobbyBtn.addEventListener('click', () => {
        close({ restore: false });
        story.goTo(1);
        story.buttons[1]?.focus({ preventScroll: true });
      });
    }
  };

  let measureSvg = null;
  const syncOffset = () => {
    if (scene) scene.setPanelOffset(panel.hidden ? 0 : panel.offsetWidth);
    else if (measureSvg) measureSvg();
  };

  function open(n, invoker = range) {
    selectLevel(n, { announce: false });
    const L = levelInfo(level);
    planType = L.units[0]?.type || '';
    panelBody.innerHTML = panelHtml(level, planType);
    bindPanel();
    openLevel = level;
    returnFocus = invoker;
    panel.hidden = false;
    root.dataset.panel = 'open';
    openBtn.setAttribute('aria-expanded', 'true');
    syncOffset();
    document.getElementById('floor-panel-title').focus({ preventScroll: true });
  }

  function close({ restore = true } = {}) {
    if (panel.hidden) return;
    panel.hidden = true;
    openLevel = null;
    root.dataset.panel = 'closed';
    openBtn.setAttribute('aria-expanded', 'false');
    syncOffset();
    if (restore && returnFocus) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });
  closeBtn.addEventListener('click', () => close());
  openBtn.addEventListener('click', () => {
    if (openLevel === level) close();
    else open(level, openBtn);
  });

  // ---------- Level control (native range: arrows, Home/End for free) ----------
  range.addEventListener('input', () => {
    selectLevel(Number(range.value));
    // With the panel open, keep it in step with the control but leave focus on the control.
    if (openLevel !== null) {
      open(level, range);
      range.focus({ preventScroll: true });
    }
  });
  range.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      open(level, range);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      selectLevel(level + (e.key === 'PageUp' ? 5 : -5));
    }
  });

  document.getElementById('enter-sample').addEventListener('click', () => {
    story.goTo(2);
    story.buttons[2]?.focus({ preventScroll: true });
  });

  // ---------- Tooltip ----------
  const showTip = (n, clientX, clientY) => {
    if (n == null) {
      tip.hidden = true;
      return;
    }
    const r = root.getBoundingClientRect();
    tip.textContent = describeLevel(n).tooltip;
    tip.style.left = `${clientX - r.left}px`;
    tip.style.top = `${clientY - r.top}px`;
    tip.hidden = false;
  };
  const setHover = (n, e) => {
    if (n !== hover) {
      hover = n;
      paint();
    }
    showTip(n, e?.clientX, e?.clientY);
  };

  // ---------- Idle sway (WebGL only) ----------
  let idleAllowed = true;
  let idleTimer = 0;
  const activity = () => {
    if (!scene) return;
    scene.setIdle(false);
    clearTimeout(idleTimer);
    if (idleAllowed && !reducedMotion.matches) idleTimer = setTimeout(() => scene.setIdle(true), IDLE_MS);
  };

  // ---------- Pointer input ----------
  if (scene) {
    let drag = null;
    host.addEventListener('pointerdown', (e) => {
      if (scene.mode !== 'explorer' || e.button !== 0) return;
      drag = { id: e.pointerId, x0: e.clientX, x: e.clientX, moved: false };
      host.setPointerCapture(e.pointerId);
      activity();
    });
    host.addEventListener('pointermove', (e) => {
      if (scene.mode !== 'explorer') return;
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x;
        drag.x = e.clientX;
        if (Math.abs(e.clientX - drag.x0) > DRAG_PX) drag.moved = true;
        if (drag.moved) {
          root.classList.add('is-dragging');
          setHover(null);
          scene.setExplorerYaw(scene.getExplorerYawTarget() - dx * DEG_PER_PX);
          activity();
          return;
        }
      }
      setHover(scene.pickLevel(e.clientX, e.clientY), e);
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const wasClick = !drag.moved && e.type === 'pointerup';
      drag = null;
      root.classList.remove('is-dragging');
      if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
      if (wasClick) {
        const n = scene.pickLevel(e.clientX, e.clientY);
        if (n != null) open(n, range);
      }
      activity();
    };
    host.addEventListener('pointerup', endDrag);
    host.addEventListener('pointercancel', endDrag);
    host.addEventListener('pointerleave', () => {
      if (!drag) setHover(null);
    });
  }

  // ---------- Hosts: WebGL canvas or SVG elevation ----------
  const setTowerVars = ({ x, top, bottom }) => {
    root.style.setProperty('--tower-x', `${x.toFixed(1)}px`);
    root.style.setProperty('--tower-top', `${top.toFixed(1)}px`);
    root.style.setProperty('--tower-bottom', `${bottom.toFixed(1)}px`);
  };

  let storyPoster = null;
  let explorerPoster = null;
  const canvas = document.getElementById('scene-canvas');
  if (scene) {
    const poster = () => {
      const c = document.createElement('canvas');
      c.className = 'scene-poster';
      c.setAttribute('aria-hidden', 'true');
      return c;
    };
    storyPoster = poster();
    explorerPoster = poster();
    storyHost.prepend(storyPoster);
    host.prepend(explorerPoster);
  } else {
    host.innerHTML = towerElevationSvg();
    svgBands = [...host.querySelectorAll('.band')];
    const measure = () => {
      const r = root.getBoundingClientRect();
      const top = svgBands[STOREYS - 1].getBoundingClientRect();
      const base = svgBands[0].getBoundingClientRect();
      setTowerVars({ x: base.left + base.width / 2 - r.left, top: top.top - r.top, bottom: base.bottom - r.top });
    };
    measure();
    measureSvg = measure;
    new ResizeObserver(measure).observe(root);
    svgBands.forEach((rect) => {
      const n = Number(rect.dataset.level);
      rect.addEventListener('pointerenter', (e) => setHover(n, e));
      rect.addEventListener('pointermove', (e) => showTip(n, e.clientX, e.clientY));
      rect.addEventListener('pointerleave', () => setHover(null));
      rect.addEventListener('click', () => open(n, range));
    });
  }

  // Mode switching: whichever host shows more of itself in the viewport owns the canvas.
  const visibleHeight = (el) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
  };
  const switchTo = (next) => {
    if (!scene || scene.mode === next) return;
    setHover(null);
    if (next === 'explorer') {
      scene.setMode('explorer', host, storyPoster);
      canvas.setAttribute('aria-label', EXPLORER_LABEL);
      canvas.removeAttribute('aria-describedby');
      syncOffset();
      activity();
    } else {
      clearTimeout(idleTimer);
      scene.setIdle(false);
      scene.setMode('story', storyHost, explorerPoster);
      canvas.setAttribute('aria-label', STORY_LABEL);
      canvas.setAttribute('aria-describedby', 'story-desc');
    }
  };
  let ticking = false;
  const checkMode = () => {
    ticking = false;
    const s = visibleHeight(storyEl);
    const x = visibleHeight(root);
    if (s === 0 && x === 0) return;
    switchTo(x > s ? 'explorer' : 'story');
  };
  const scheduleMode = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(checkMode);
    }
  };
  if (scene) {
    window.addEventListener('scroll', scheduleMode, { passive: true });
    window.addEventListener('resize', scheduleMode);
    window.addEventListener('resize', syncOffset);
    checkMode();
  }

  selectLevel(level, { announce: false });

  const hook = {
    selectLevel(n) {
      selectLevel(n);
    },
    open(n) {
      open(n, range);
    },
    close() {
      close();
    },
    setYaw(deg) {
      if (scene) scene.setExplorerYaw(deg, true);
    },
    getYaw() {
      return scene ? scene.getExplorerYaw() : 0;
    },
    idle(on) {
      idleAllowed = Boolean(on);
      if (!scene) return;
      clearTimeout(idleTimer);
      scene.setIdle(idleAllowed);
    },
    screenPointForLevel(n) {
      if (scene) return scene.screenPointForLevel(n);
      const rect = svgBands?.[n - 1]?.getBoundingClientRect();
      return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
    },
    get mode() {
      return scene ? scene.mode : 'fallback';
    },
  };
  window.__tessera = Object.assign(window.__tessera || {}, { explorer: hook });

  return { setTowerVars };
}

/** Explorer frame callback for createScene: writes the projected tower position as CSS vars. */
export function explorerFrameHandler() {
  const root = document.getElementById('explorer');
  let last = '';
  return ({ x, top, bottom }) => {
    if (!root) return;
    const key = `${x.toFixed(1)}|${top.toFixed(1)}|${bottom.toFixed(1)}`;
    if (key === last) return;
    last = key;
    root.style.setProperty('--tower-x', `${x.toFixed(1)}px`);
    root.style.setProperty('--tower-top', `${top.toFixed(1)}px`);
    root.style.setProperty('--tower-bottom', `${bottom.toFixed(1)}px`);
  };
}
