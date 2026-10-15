import { UNITS } from '../content/facts.js';
import { PLANS, floorPlanSvg, roomArea } from './floorplans.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (a) => (Number.isInteger(a) ? String(a) : a.toFixed(1));

function scheduleHtml(unit) {
  const levels = PLANS[unit.id];
  const rows = levels
    .map((lvl) => {
      const head = lvl.title ? `<div><dt class="level">${esc(lvl.title)}</dt><dd></dd></div>` : '';
      const rooms = lvl.rooms
        .map((r) => `<div><dt>${esc(r.name)}</dt><dd>${fmt(roomArea(r))} sqm</dd></div>`)
        .join('');
      const balcony = `<div><dt>Balcony</dt><dd>${fmt(lvl.balcony.w * lvl.balcony.h)} sqm</dd></div>`;
      return head + rooms + balcony;
    })
    .join('');
  return `<h4>${esc(unit.label)}</h4>
<p class="plan-meta">${unit.sqm} sqm interior · Floors ${esc(unit.floors)} · ${esc(unit.priceLabel === 'Price on request' ? unit.priceLabel : `From ${unit.priceLabel}`)}</p>
<dl class="rooms">${rows}</dl>`;
}

/** ARIA tabs pattern with automatic activation, arrow keys, Home and End. */
function renderTabs(tablist, panelsEl) {
  tablist.innerHTML = UNITS.map(
    (u, i) =>
      `<button type="button" role="tab" id="tab-${u.id}" aria-controls="panel-${u.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(u.label)}</button>`,
  ).join('');
  panelsEl.innerHTML = UNITS.map(
    (u, i) =>
      `<div class="plan-panel" role="tabpanel" id="panel-${u.id}" aria-labelledby="tab-${u.id}" tabindex="0"${i === 0 ? '' : ' hidden'}>
  <figure class="plan-figure">${floorPlanSvg(u.id)}</figure>
  <div class="plan-schedule">${scheduleHtml(u)}</div>
</div>`,
  ).join('');

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const select = (idx, focus) => {
    tabs.forEach((t, i) => {
      const on = i === idx;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tabs[idx].focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i, false));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next !== null) {
        e.preventDefault();
        select(next, true);
      }
    });
  });
}

export function initResidences() {
  const tablist = document.getElementById('plan-tabs');
  const panels = document.getElementById('plan-panels');
  if (tablist && panels) renderTabs(tablist, panels);
}
