// Table builders. Each returns a Group based at y = 0. No DOM use.

import * as THREE from 'three';
import { Batcher, lathe, extrudeProfile, roundedBox, worldBox } from '../geometry-kit.js';
import { T, assemble, taperedLeg } from './util.js';
import { teakMaterial } from './seating.js';

/**
 * Round drum table turned on a lathe: shadow-gap base, straight side and an eased top edge.
 * @param {Record<string, import('three').Material>} mats
 * @param {{radius?: number, height?: number, material?: import('three').Material}} [opts]
 */
export function drumTable(mats, { radius = 0.45, height = 0.38, material = mats.travertine } = {}) {
  const r = radius;
  const h = height;
  const profile = [
    [0, 0],
    [r - 0.05, 0],
    [r - 0.05, 0.03],
    [r - 0.006, 0.036],
    [r, 0.05],
    [r, h - 0.016],
    [r - 0.012, h],
    [0, h],
  ];
  const b = new Batcher();
  const geo = lathe(profile, 64);
  b.add(geo, material, T());
  geo.dispose();
  return assemble('drum-table', b, mats, { decal: [r * 2 + 0.3, r * 2 + 0.3] });
}

/** Travertine drum side table (0.5 m tall). */
export function sideTable(mats, { radius = 0.24, height = 0.5 } = {}) {
  const g = drumTable(mats, { radius, height, material: mats.travertine });
  g.name = 'side-table';
  return g;
}

/** Rounded-rectangle outline centred on the origin. */
function roundedRect(w, d, r) {
  const s = new THREE.Shape();
  const x = w / 2;
  const y = d / 2;
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y);
  s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x, y - r);
  s.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
  s.lineTo(-x + r, y);
  s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-x, -y + r);
  s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/**
 * Marble coffee table: a rounded-rectangle slab with a 40 mm bevelled edge on a recessed
 * marble plinth. `userData.top` is the top surface height.
 * @param {Record<string, THREE.Material>} mats
 * @param {{w?: number, d?: number, height?: number}} [opts]
 */
export function marbleCoffeeTable(mats, { w = 1.3, d = 0.8, height = 0.36 } = {}) {
  const b = new Batcher();
  const bevel = 0.04;
  const depth = 0.006;
  const thick = depth + 2 * bevel;
  const slab = extrudeProfile(roundedRect(w - 2 * bevel, d - 2 * bevel, 0.12), depth, bevel);
  slab.rotateX(-Math.PI / 2);
  b.add(slab, mats.marble, T(0, height - thick / 2, 0));
  slab.dispose();
  b.add(roundedBox(w * 0.62, height - thick, d * 0.5, 0.02, 2), mats.marble, T(0, (height - thick) / 2, 0));
  const g = assemble('marble-coffee-table', b, mats, { decal: [w + 0.3, d + 0.3] });
  g.userData.top = height;
  return g;
}

/**
 * Walnut dining table: book-grain top with grain along the length, aprons and tapered legs.
 * @param {Record<string, THREE.Material>} mats
 */
export function diningTable(mats, { length = 2.2, width = 1.0, height = 0.75 } = {}) {
  const b = new Batcher();
  const top = worldBox(width, 0.04, length, { uvScale: 1 / 1.6 });
  top.rotateY(Math.PI / 2); // grain (v) along the table length
  b.add(top, mats.walnut, T(0, height - 0.02, 0));
  top.dispose();
  const ix = length / 2 - 0.14;
  const iz = width / 2 - 0.1;
  for (const z of [-iz, iz]) b.add(roundedBox(length - 0.3, 0.08, 0.025, 0.006, 1), mats.walnut, T(0, height - 0.08, z));
  for (const x of [-ix, ix]) b.add(roundedBox(0.025, 0.08, width - 0.22, 0.006, 1), mats.walnut, T(x, height - 0.08, 0));
  const leg = taperedLeg(0.065, 0.038, height - 0.04);
  for (const x of [-ix, ix]) for (const z of [-iz, iz]) b.add(leg, mats.walnut, T(x, 0, z));
  leg.dispose();
  const g = assemble('dining-table', b, mats, { decal: [length + 0.9, width + 1.0] });
  g.userData.top = height;
  return g;
}

/**
 * Kitchen island: marble top with waterfall ends over a walnut base on a recessed ink plinth.
 * The base sits toward -z, leaving a 0.3 m knee overhang on +z for stools.
 * @param {Record<string, THREE.Material>} mats
 */
export function kitchenIsland(mats, { w = 2.4, d = 0.95, height = 0.92 } = {}) {
  const b = new Batcher();
  const t = 0.04;
  b.add(worldBox(w, t, d, { uvScale: 1 / 1.6 }), mats.marble, T(0, height - t / 2, 0));
  for (const s of [-1, 1]) {
    b.add(worldBox(t, height - t, d, { uvScale: 1 / 1.6, u0: s * 0.37, flip: s > 0 }), mats.marble, T(s * (w / 2 - t / 2), (height - t) / 2, 0));
  }
  const baseD = d - 0.33;
  const baseZ = -d / 2 + 0.02 + baseD / 2;
  b.add(new THREE.BoxGeometry(w - 2 * t - 0.12, 0.1, baseD - 0.08), mats.inkMetal, T(0, 0.05, baseZ));
  b.add(worldBox(w - 2 * t - 0.02, height - t - 0.1, baseD, { uvScale: 1 / 1.2 }), mats.walnut, T(0, 0.1 + (height - t - 0.1) / 2, baseZ));
  const g = assemble('kitchen-island', b, mats, { decal: [w + 0.3, d + 0.3] });
  g.userData.top = height;
  return g;
}

/** Slatted teak outdoor low table (0.42 m square, 0.32 m tall). */
export function outdoorLowTable(mats, { size = 0.42, height = 0.32 } = {}) {
  const b = new Batcher();
  const wood = teakMaterial(mats);
  const n = 6;
  const sw = size / n;
  for (let i = 0; i < n; i++) {
    b.add(roundedBox(size, 0.022, sw - 0.008, 0.005, 1), wood, T(0, height - 0.011, -size / 2 + (i + 0.5) * sw));
  }
  for (const z of [-1, 1]) b.add(roundedBox(size, 0.05, 0.03, 0.006, 1), wood, T(0, height - 0.047, z * (size / 2 - 0.03)));
  const leg = taperedLeg(0.04, 0.032, height - 0.022);
  const k = size / 2 - 0.03;
  for (const x of [-k, k]) for (const z of [-k, k]) b.add(leg, wood, T(x, 0, z));
  leg.dispose();
  return assemble('outdoor-low-table', b, mats, { decal: [size + 0.25, size + 0.25] });
}
