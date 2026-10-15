import * as THREE from 'three';
import { Batcher, roundedBox, extrudeProfile, lathe, contactShadow } from '../geometry-kit.js';
import { cladPanels, instancedGeometry } from './helpers.js';
import { mulberry32, SCENE_SEED } from '../../lib/prng.js';
import { modularSofa, boucleChair } from '../furniture/seating.js';
import { drumTable } from '../furniture/tables.js';
import { rug, vase, plantedTree, VASE_PROFILES, PLANTER_PROFILES } from '../furniture/decor.js';
import { globePendant } from '../furniture/lighting.js';

const H = 7.2; // double height, slab to slab
const FLOOR = 0.1; // finished floor level
const CEIL = 6.95; // underside of the plaster ceiling
const T = (x, y, z, ry = 0) => new THREE.Matrix4().compose(
  new THREE.Vector3(x, y, z),
  new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry),
  new THREE.Vector3(1, 1, 1),
);

/** Bronze lift portal: a U frame around a 1.4 × 2.7 m opening, 0.12 m deep. */
function portalGeometry() {
  const s = new THREE.Shape();
  const o = 0.9;
  const i = 0.7;
  const top = 3.0;
  const head = 2.7;
  const b = 0.008;
  s.moveTo(-o + b, 0);
  s.lineTo(-i - b, 0);
  s.lineTo(-i - b, head + b);
  s.lineTo(i + b, head + b);
  s.lineTo(i + b, 0);
  s.lineTo(o - b, 0);
  s.lineTo(o - b, top - b);
  s.lineTo(-o + b, top - b);
  s.closePath();
  return extrudeProfile(s, 0.12, b);
}

/**
 * Double-height lobby (7.2 m), no reception desk: book-matched travertine floor, oak slat wall
 * with an LED cove, two travertine lift cores with bronze portals, a coffered ceiling, and a
 * lounge under a globe pendant. Exactly three point lights (the exterior shares them).
 */
export function createLobby(m) {
  const g = new THREE.Group();
  g.name = 'lobby';
  const rand = mulberry32(SCENE_SEED + 31);
  const grout = new THREE.MeshStandardMaterial({ color: '#8E8678', roughness: 0.95 });
  const b = new Batcher();

  // Floor: 1.2 m book-matched travertine tiles on a grout bed.
  b.add(new THREE.BoxGeometry(24, FLOOR - 0.005, 12.6), grout, T(0, (FLOOR - 0.005) / 2, 6.8));
  cladPanels(b, m.travertine, { axis: 'y', at: FLOOR - 0.06, dir: 1, a0: -12, a1: 12, b0: 0.5, b1: 13.1, pw: 1.2, ph: 1.26, gap: 0.004, t: 0.06 }, rand);

  // Oak slat wall: dark backing, rounded slats (instanced), LED cove behind a plaster bulkhead.
  b.add(new THREE.BoxGeometry(24, H, 0.2), m.oakDark, T(0, H / 2, 0.5));
  const slatH = CEIL - FLOOR - 0.05;
  const slats = [];
  for (let x = -11.9; x <= 11.9; x += 0.2) slats.push({ x, y: FLOOR + 0.05 + slatH / 2, z: 0.66 });
  g.add(instancedGeometry(roundedBox(0.08, slatH, 0.1, 0.03, 1), m.oak, slats));
  b.add(new THREE.BoxGeometry(24, 0.5, 1.0), m.plaster, T(0, CEIL - 0.25, 1.45));
  b.add(new THREE.BoxGeometry(24, 0.035, 0.035), m.ledStrip, T(0, CEIL - 0.46, 0.93));

  // Ceiling with a coffer grid of rounded beams.
  b.add(new THREE.BoxGeometry(24, 0.1, 12.6), m.plaster, T(0, CEIL + 0.05, 6.8));
  const beamD = 0.32;
  for (let k = 1; k < 10; k++) b.add(roundedBox(0.28, beamD, 12.4, 0.03, 2), m.plaster, T(-12 + 2.4 * k, CEIL - beamD / 2, 6.85));
  for (let k = 1; k < 5; k++) b.add(roundedBox(24, beamD, 0.28, 0.03, 2), m.plaster, T(0, CEIL - beamD / 2, 0.6 + 2.48 * k));
  // 12 downlights, one per coffer, around (not over) the lounge.
  const downlights = [];
  for (const x of [-8.4, -3.6, 3.6, 8.4]) {
    for (const z of [4.32, 9.28, 11.76]) downlights.push({ x, y: CEIL - 0.003, z });
  }
  g.add(instancedGeometry(new THREE.CircleGeometry(0.09, 20).rotateX(Math.PI / 2), m.warmLight, downlights));

  // Two lift cores: travertine panels on three faces, bronze portals with two-leaf doors.
  const portal = portalGeometry();
  for (const x of [-8.5, -3.5]) {
    const z0 = 0.8;
    const z1 = 3.4;
    b.add(new THREE.BoxGeometry(3.4, H, z1 - z0), grout, T(x, H / 2, (z0 + z1) / 2));
    const clad = (o) => cladPanels(b, m.travertine, { b0: FLOOR, b1: CEIL, pw: 0.85, ph: 1.14, gap: 0.01, t: 0.03, ...o }, rand);
    clad({ axis: 'z', at: z1, dir: 1, a0: x - 1.7, a1: x + 1.7 });
    clad({ axis: 'x', at: x - 1.7, dir: -1, a0: z0, a1: z1 });
    clad({ axis: 'x', at: x + 1.7, dir: 1, a0: z0, a1: z1 });
    const face = z1 + 0.03;
    b.add(portal, m.bronze, T(x, FLOOR, face + 0.06));
    b.add(new THREE.BoxGeometry(1.4, 2.7, 0.005), m.inkMetal, T(x, FLOOR + 1.35, face + 0.004));
    for (const s of [-1, 1]) b.add(roundedBox(0.69, 2.7, 0.04, 0.008, 1), m.bronze, T(x + s * 0.355, FLOOR + 1.35, face + 0.025));
  }
  portal.dispose();

  // Low travertine console on the slat wall (not a desk), with a vessel and a small sculpture.
  const consoleAt = { x: 1.4, z: 0.71 + 0.03 + 0.225 };
  b.add(roundedBox(2.3, 0.05, 0.36, 0.01, 1), m.bronze, T(consoleAt.x, FLOOR + 0.025, consoleAt.z));
  b.add(roundedBox(2.4, 0.42, 0.45, 0.02, 2), m.travertine, T(consoleAt.x, FLOOR + 0.05 + 0.21, consoleAt.z));
  const consoleTop = FLOOR + 0.47;
  const sculpture = lathe(
    [
      [0, 0],
      [0.1, 0],
      [0.12, 0.04],
      [0.1, 0.08],
      [0.07, 0.09],
      [0.09, 0.13],
      [0.08, 0.17],
      [0.05, 0.18],
      [0.06, 0.22],
      [0.04, 0.26],
      [0, 0.27],
    ],
    40,
  );
  b.add(sculpture, m.bronze, T(consoleAt.x + 0.75, consoleTop, consoleAt.z));
  sculpture.dispose();
  const consoleShadow = contactShadow(2.7, 0.7, m);
  consoleShadow.position.set(consoleAt.x, FLOOR + 0.004, consoleAt.z + 0.05);
  g.add(consoleShadow);

  // Bench facing the lifts: travertine plinth, oak top.
  const bench = { x: -6, z: 5.0 };
  b.add(roundedBox(2.8, 0.36, 0.62, 0.02, 2), m.travertine, T(bench.x, FLOOR + 0.18, bench.z));
  b.add(roundedBox(3.0, 0.06, 0.72, 0.015, 2), m.oak, T(bench.x, FLOOR + 0.39, bench.z));
  const benchShadow = contactShadow(3.4, 1.1, m);
  benchShadow.position.set(bench.x, FLOOR + 0.004, bench.z);
  g.add(benchShadow);

  b.build({ cast: true, receive: true }).forEach((mesh) => g.add(mesh));

  // --- Furniture -------------------------------------------------------------------------
  const place = (obj, x, y, z, ry = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.y = ry;
    g.add(obj);
    return obj;
  };
  // Lounge on a 3.6 × 2.6 m wool rug, centred in one coffer.
  const lounge = { x: -1.2, z: 6.8 };
  const theRug = place(rug(m, { w: 3.6, d: 2.6 }), lounge.x, FLOOR, lounge.z);
  const onRug = FLOOR + theRug.userData.top;
  place(modularSofa(m, { length: 2.4, fabric: m.linenOlive }), lounge.x - 1.25, onRug, lounge.z, Math.PI / 2);
  place(drumTable(m, { radius: 0.45, height: 0.38 }), lounge.x + 0.05, onRug, lounge.z);
  // Chairs face west (-x), each turned a little toward the table.
  place(boucleChair(m), lounge.x + 1.25, onRug, lounge.z - 0.65, -Math.PI / 2 + 0.25);
  place(boucleChair(m), lounge.x + 1.25, onRug, lounge.z + 0.65, -Math.PI / 2 - 0.25);
  place(vase(m, { profile: VASE_PROFILES.bowl, scale: 0.9 }), lounge.x + 0.05, onRug + 0.38, lounge.z);
  place(globePendant(m, { count: 9, drop: 2.8, spread: 0.75 }), lounge.x, CEIL, lounge.z);

  // Olive trees in travertine planters either side of the console; vessels on the console.
  // Kept 1.3 m clear of the slat wall (z 0.71) and lift core 2 (x ≤ -1.77) so leaves stay free.
  place(plantedTree(m, { planterProfile: PLANTER_PROFILES.drum, height: 2.8, seed: 1 }), -0.5, FLOOR, 2.4);
  place(plantedTree(m, { planterProfile: PLANTER_PROFILES.drum, height: 2.8, seed: 2 }), 3.5, FLOOR, 2.3, 1.3);
  place(vase(m, { profile: VASE_PROFILES.amphora, scale: 1.5 }), consoleAt.x - 0.6, consoleTop, consoleAt.z);
  place(vase(m, { profile: VASE_PROFILES.bottle, scale: 1.2 }), consoleAt.x - 0.2, consoleTop, consoleAt.z + 0.04);

  // Exactly three point lights: two washes and a warm pool under the pendant.
  for (const [x, y, z, i] of [
    [-6, 6.2, 7.5, 24],
    [lounge.x, 4.3, lounge.z, 9],
    [5, 6.2, 6.5, 24],
  ]) {
    const light = new THREE.PointLight('#FFD3A0', i, 0, 2);
    light.position.set(x, y, z);
    g.add(light);
  }
  return g;
}
