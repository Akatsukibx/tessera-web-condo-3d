// Seating builders. Each returns a Group based at y = 0, front facing +z. No DOM use.

import * as THREE from 'three';
import { Batcher, roundedBox, cushion, extrudeProfile, tube, lathe } from '../geometry-kit.js';
import { roughnessTexture } from '../textures.js';
import { T, assemble, derived, taperedLeg } from './util.js';

const deg = THREE.MathUtils.degToRad;

/** Straight round rod between two [x, y, z] points. */
function rod(b, material, a, c, r, radial = 10) {
  const g = tube([a, c], r, { tubularSegments: 1, radialSegments: radial });
  b.add(g, material);
  g.dispose();
}

/** Oiled teak for outdoor pieces: warm mid-brown, walnut grain roughness. */
function teak(mats) {
  return derived(mats, 'teak', () =>
    new THREE.MeshStandardMaterial({ color: '#9C6A43', roughness: 1, roughnessMap: roughnessTexture('walnut') }),
  );
}

/**
 * Low modular sofa: recessed plinth, upholstered base and arms, separate seat and back
 * cushions with a soft sag.
 * @param {Record<string, THREE.Material>} mats
 * @param {{length?: number, depth?: number, fabric?: THREE.Material, base?: THREE.Material}} [opts]
 */
export function modularSofa(mats, { length = 2.4, depth = 0.95, fabric = mats.linenOlive, base = mats.walnut } = {}) {
  const b = new Batcher();
  const arm = 0.2;
  const plinthH = 0.06;
  const bodyTop = 0.3;
  b.add(roundedBox(length - 0.12, plinthH, depth - 0.12, 0.01, 1), base, T(0, plinthH / 2, 0));
  b.add(roundedBox(length, bodyTop - plinthH, depth, 0.03), fabric, T(0, (plinthH + bodyTop) / 2, 0));
  for (const s of [-1, 1]) {
    b.add(roundedBox(arm, 0.58 - plinthH, depth, 0.07), fabric, T(s * (length / 2 - arm / 2), (plinthH + 0.58) / 2, 0));
  }
  // Back frame behind the back cushions.
  b.add(roundedBox(length - 2 * arm, 0.36, 0.16, 0.05), fabric, T(0, bodyTop + 0.18, -depth / 2 + 0.08));

  const inner = length - 2 * arm;
  const n = Math.max(1, Math.round(inner / 0.72));
  const w = inner / n - 0.012;
  const seatH = 0.16;
  const seat = cushion(w, seatH, depth - 0.17, 0.025, { segments: 10 });
  // Back cushion: thickness on its local y, tilted 12° back so its soft face looks forward.
  const back = cushion(w, 0.18, 0.44, 0.02, { segments: 10 });
  for (let i = 0; i < n; i++) {
    const x = -inner / 2 + (i + 0.5) * (inner / n);
    b.add(seat, fabric, T(x, bodyTop + seatH / 2, 0.085));
    b.add(back, fabric, T(x, bodyTop + seatH + 0.2, -depth / 2 + 0.27, THREE.MathUtils.degToRad(78)));
  }
  seat.dispose();
  back.dispose();
  return assemble('modular-sofa', b, mats, { decal: [length + 0.3, depth + 0.3] });
}

/** Back band of a tub chair in plan: an arc wrapping the back and part of the sides. */
function tubBackShape(outer, inner, from, to) {
  const s = new THREE.Shape();
  s.absarc(0, 0, outer, from, to, false);
  s.absarc(0, 0, inner, to, from, true);
  s.closePath();
  return s;
}

/**
 * Boucle tub lounge chair: upholstered base on a walnut plinth, loose seat cushion and a
 * curved back band (extruded arc).
 * @param {Record<string, THREE.Material>} mats
 * @param {{fabric?: THREE.Material, base?: THREE.Material}} [opts]
 */
export function boucleChair(mats, { fabric = mats.boucle, base = mats.walnut } = {}) {
  const b = new Batcher();
  const bodyTop = 0.39;
  b.add(roundedBox(0.66, 0.05, 0.64, 0.01, 1), base, T(0, 0.025, 0));
  b.add(roundedBox(0.8, bodyTop - 0.05, 0.78, 0.08), fabric, T(0, (0.05 + bodyTop) / 2, 0));
  const seat = cushion(0.6, 0.12, 0.58, 0.02, { segments: 10 });
  b.add(seat, fabric, T(0, bodyTop + 0.06, 0.08));
  seat.dispose();

  const deg = THREE.MathUtils.degToRad;
  const backH = 0.36;
  const bevel = 0.02;
  const band = extrudeProfile(tubBackShape(0.37, 0.28, deg(-20), deg(200)), backH, bevel);
  // Shape y → -z (behind the seat), extrusion → up.
  band.rotateX(-Math.PI / 2);
  b.add(band, fabric, T(0, bodyTop + backH / 2 + bevel, 0));
  band.dispose();
  return assemble('boucle-chair', b, mats, { decal: [1.0, 1.0] });
}

/**
 * Lounge armchair: cognac leather seat and back slings with leather arm pads on a bent
 * brass tube frame. Back top at 0.8 m.
 * @param {Record<string, THREE.Material>} mats
 * @param {{leather?: THREE.Material, frame?: THREE.Material}} [opts]
 */
export function loungeChair(mats, { leather = mats.leather, frame = mats.brass } = {}) {
  const b = new Batcher();
  const r = 0.012;
  const W = 0.33;
  const joint = new THREE.SphereGeometry(r, 10, 8);
  // Side-frame nodes as [y, z]: front leg up to the arm, arm back, back post, rear leg.
  const foot = [0, 0.34];
  const armF = [0.56, 0.3];
  const armB = [0.58, -0.22];
  const top = [0.78, -0.39];
  const rear = [0, -0.36];
  const seatF = [0.36, 0.314]; // on foot → armF
  const seatB = [0.3, -0.288]; // on armB → rear
  const P = (x, [y, z]) => [x, y, z];
  for (const s of [-1, 1]) {
    const x = s * W;
    rod(b, frame, P(x, foot), P(x, armF), r);
    rod(b, frame, P(x, armF), P(x, armB), r);
    rod(b, frame, P(x, armB), P(x, top), r);
    rod(b, frame, P(x, armB), P(x, rear), r);
    for (const n of [armF, armB, top, seatF, seatB]) b.add(joint, frame, T(...P(x, n)));
    // Leather arm pad along the arm tube (back end slightly higher).
    b.add(roundedBox(0.06, 0.03, 0.5, 0.012, 2), leather, T(x, 0.585, 0.04, 0.038));
  }
  for (const n of [seatF, seatB, top]) rod(b, frame, P(-W, n), P(W, n), r);
  joint.dispose();

  // Seat sling between the seat rails, front 6 cm higher than the back.
  const seat = cushion(0.62, 0.08, 0.62, 0.03, { segments: 10 });
  b.add(seat, leather, T(0, 0.37, 0.013, -0.099));
  seat.dispose();
  // Back sling from the rear seat rail to the top rail, raked 12° back.
  const back = cushion(0.62, 0.07, 0.5, 0.02, { segments: 10 });
  b.add(back, leather, T(0, 0.549, -0.295, Math.PI / 2 - 0.209));
  back.dispose();
  return assemble('lounge-chair', b, mats, { decal: [0.95, 1.0] });
}

/**
 * Dining chair parts for instancing: walnut frame (tapered legs, apron, round back posts,
 * curved back rail) and a linen seat pad. Front faces +z, seat at 0.47 m.
 * @param {Record<string, THREE.Material>} mats
 * @returns {{geometry: THREE.BufferGeometry, material: THREE.Material}[]}
 */
export function diningChairGeometry(mats, { frame = mats.walnut, seat = mats.linenPaper } = {}) {
  const b = new Batcher();
  const seatY = 0.44;
  const leg = taperedLeg(0.034, 0.024, seatY - 0.03);
  for (const [x, z] of [
    [-0.2, 0.19],
    [0.2, 0.19],
    [-0.2, -0.19],
    [0.2, -0.19],
  ]) {
    b.add(leg, frame, T(x, 0, z));
  }
  leg.dispose();
  b.add(roundedBox(0.46, 0.05, 0.44, 0.01, 1), frame, T(0, seatY - 0.025, 0));
  for (const s of [-1, 1]) rod(b, frame, [s * 0.2, seatY - 0.01, -0.19], [s * 0.205, 0.78, -0.225], 0.014, 8);

  // Back rail: a shallow arc in plan (R 0.9 m, ±15°), 13 cm tall.
  const R = 0.9;
  const half = deg(15);
  const s = new THREE.Shape();
  s.absarc(0, 0, R, Math.PI / 2 - half, Math.PI / 2 + half, false);
  s.absarc(0, 0, R - 0.022, Math.PI / 2 + half, Math.PI / 2 - half, true);
  s.closePath();
  const rail = extrudeProfile(s, 0.13, 0.004);
  rail.rotateX(-Math.PI / 2); // shape y → -z (behind), extrusion → up
  b.add(rail, frame, T(0, 0.715, R - 0.235));
  rail.dispose();

  const pad = cushion(0.46, 0.06, 0.44, 0.012, { segments: 10 });
  b.add(pad, seat, T(0, seatY + 0.03, 0.01));
  pad.dispose();
  return b.build().map((m) => ({ geometry: m.geometry, material: m.material }));
}

/**
 * Counter stool parts for instancing: dished walnut seat on four splayed brass legs with a
 * brass seat ring and footrest ring. Seat top at 0.66 m.
 * @param {Record<string, THREE.Material>} mats
 * @returns {{geometry: THREE.BufferGeometry, material: THREE.Material}[]}
 */
export function barStoolGeometry(mats, { seat = mats.walnut, frame = mats.brass } = {}) {
  const b = new Batcher();
  const H = 0.66;
  const under = H - 0.045;
  const top = lathe(
    [
      [0, 0],
      [0.17, 0],
      [0.19, 0.012],
      [0.195, 0.035],
      [0.185, 0.045],
      [0.12, 0.038],
      [0, 0.034],
    ],
    40,
  );
  b.add(top, seat, T(0, under, 0));
  top.dispose();
  const rAt = (y) => 0.2 - 0.08 * (y / under);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    rod(b, frame, [Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2], [Math.cos(a) * 0.12, under, Math.sin(a) * 0.12], 0.01, 8);
  }
  const foot = new THREE.TorusGeometry(rAt(0.25), 0.008, 8, 48).rotateX(Math.PI / 2);
  b.add(foot, frame, T(0, 0.25, 0));
  foot.dispose();
  const ring = new THREE.TorusGeometry(0.125, 0.01, 8, 40).rotateX(Math.PI / 2);
  b.add(ring, frame, T(0, under - 0.008, 0));
  ring.dispose();
  return b.build().map((m) => ({ geometry: m.geometry, material: m.material }));
}

/**
 * Outdoor chaise lounger: teak frame and slats, raised backrest at 42°, olive linen seat and
 * back cushions. Foot end at +z, 1.85 m long.
 * @param {Record<string, THREE.Material>} mats
 */
export function outdoorLounger(mats, { fabric = mats.linenOlive } = {}) {
  const b = new Batcher();
  const wood = teak(mats);
  const L = 1.85;
  const W = 0.68;
  const leg = roundedBox(0.06, 0.22, 0.06, 0.01, 1);
  for (const x of [-0.29, 0.29]) for (const z of [-0.8, 0.8]) b.add(leg, wood, T(x, 0.11, z));
  for (const x of [-0.315, 0.315]) b.add(roundedBox(0.05, 0.1, L, 0.012, 1), wood, T(x, 0.27, 0));
  for (const z of [-1, 1]) b.add(roundedBox(W - 0.1, 0.08, 0.05, 0.01, 1), wood, T(0, 0.27, z * (L / 2 - 0.025)));
  const slat = roundedBox(W - 0.1, 0.02, 0.055, 0.006, 1);
  for (let z = -0.25; z <= L / 2 - 0.08; z += 0.075) b.add(slat, wood, T(0, 0.31, z));

  // Backrest hinged at z -0.28: local -z runs up the backrest.
  const hinge = T(0, 0.32, -0.28, deg(42));
  const at = (x, y, z) => new THREE.Matrix4().multiplyMatrices(hinge, T(x, y, z));
  for (let t = 0.04; t <= 0.6; t += 0.075) b.add(slat, wood, at(0, 0, -t));
  for (const x of [-0.29, 0.29]) b.add(roundedBox(0.04, 0.04, 0.62, 0.01, 1), wood, at(x, -0.025, -0.31));

  const seat = cushion(0.6, 0.07, 1.12, 0.015, { segments: 10 });
  b.add(seat, fabric, T(0, 0.355, 0.29));
  seat.dispose();
  const back = cushion(0.6, 0.07, 0.6, 0.015, { segments: 10 });
  b.add(back, fabric, at(0, 0.045, -0.31));
  back.dispose();
  return assemble('outdoor-lounger', b, mats, { decal: [0.9, 2.05] });
}

export { teak as teakMaterial };
