import '@fontsource/ibm-plex-sans/300.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/sections.css';

import { KEY_FIGURES, AMENITIES, DISTANCES } from './content/facts.js';
import { initNav } from './ui/nav.js';
import { initResidences } from './ui/residences.js';
import { initBookingForm } from './ui/booking-form.js';
import { initStory } from './ui/story.js';
import { initExplorer, explorerFrameHandler } from './ui/explorer.js';
import { icon } from './ui/icons.js';
import { locationMapSvg } from './ui/location-map.js';
import { hasWebGL } from './scene/webgl-support.js';
import { renderFallback } from './scene/fallback.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function renderStaticContent() {
  document.getElementById('figures').innerHTML = KEY_FIGURES.map(
    (f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`,
  ).join('');

  document.getElementById('amenity-list').innerHTML = AMENITIES.map(
    (a) => `<li>${icon(a.icon)}<p class="amenity-level">${esc(a.level)}</p><div><h3>${esc(a.title)}</h3><p>${esc(a.copy)}</p></div></li>`,
  ).join('');

  document.getElementById('distances').innerHTML = DISTANCES.map(
    (d) => `<div><dt>${esc(d.label)}<span>${esc(d.note)}</span></dt><dd>${esc(d.value)}</dd></div>`,
  ).join('');

  document.getElementById('map-figure').innerHTML = locationMapSvg();
}

const markReady = () => {
  document.documentElement.dataset.sceneReady = 'true';
};

async function boot() {
  renderStaticContent();
  initNav();
  initResidences();
  initBookingForm();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('scene-canvas'));
  let scene = null;

  if (hasWebGL()) {
    try {
      const { createScene } = await import('./scene/index.js');
      scene = createScene(canvas, {
        reducedMotion,
        overlay: document.getElementById('lift-overlay'),
        onFirstFrame: markReady,
        onExplorerFrame: explorerFrameHandler(),
      });
    } catch (err) {
      console.warn('3D scene unavailable, showing the static drawing instead.', err);
      scene = null;
    }
  }

  if (!scene) {
    renderFallback(canvas);
    markReady();
  }

  const story = initStory({ scene, reducedMotion });
  initExplorer({ scene, story, reducedMotion });
}

boot();
