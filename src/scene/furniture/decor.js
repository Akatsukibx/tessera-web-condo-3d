// Decor builders: rug, vases, planted trees. Each returns a Group based at y = 0. No DOM use.

import * as THREE from 'three';
import { Batcher, lathe, taperedTube, roundedBox, worldBox, extrudeProfile } from '../geometry-kit.js';
import { mulberry32, SCENE_SEED } from '../../lib/prng.js';
import { T, assemble, derived } from './util.js';

/** Lathe profiles [radius, height] in metres, bottom to rim then down the inside. */
export const VASE_PROFILES = {
  amphora: [
    [0, 0],
    [0.065, 0],
    [0.09, 0.04],
    [0.12, 0.14],
    [0.115, 0.23],
    [0.07, 0.31],
    [0.05, 0.35],
    [0.058, 0.38],
    [0.05, 0.38],
    [0.042, 0.34],
    [0, 0.32],
  ],
  bottle: [
    [0, 0],
    [0.07, 0],
    [0.085, 0.02],
    [0.09, 0.16],
    [0.06, 0.22],
    [0.022, 0.27],
    [0.022, 0.4],
    [0.028, 0.41],
    [0.016, 0.41],
    [0, 0.38],
  ],
  bowl: [
    [0, 0],
    [0.06, 0],
    [0.07, 0.015],
    [0.15, 0.08],
    [0.18, 0.13],
    [0.172, 0.13],
    [0.14, 0.085],
    [0, 0.03],
  ],
};

/** Planter profiles: outside from the base to the rim, then the inner wall down to soil level. */
export const PLANTER_PROFILES = {
  drum: [
    [0, 0],
    [0.44, 0],
    [0.46, 0.03],
    [0.5, 0.08],
    [0.55, 0.62],
    [0.56, 0.7],
    [0.5, 0.7],
    [0.49, 0.62],
    [0, 0.62],
  ],
  bowl: [
    [0, 0],
    [0.3, 0],
    [0.33, 0.04],
    [0.52, 0.28],
    [0.6, 0.5],
    [0.62, 0.56],
    [0.56, 0.56],
    [0.54, 0.48],
    [0, 0.48],
  ],
};

/**
 * Flat wool rug with the woolRug image across its whole top (box UVs are 0..1 per face).
 * @param {Record<string, THREE.Material>} mats
 * @param {{w?: number, d?: number}} [opts]
 */
export function rug(mats, { w = 3.2, d = 2.4 } = {}) {
  const b = new Batcher();
  const g = new THREE.BoxGeometry(w, 0.012, d);
  b.add(g, mats.wool, T(0, 0.006, 0));
  g.dispose();
  const group = assemble('rug', b, mats, { cast: false });
  group.userData.top = 0.012;
  return group;
}

/**
 * Turned vessel from a lathe profile.
 * @param {Record<string, THREE.Material>} mats
 * @param {{profile?: number[][], material?: THREE.Material, scale?: number}} [opts]
 */
export function vase(mats, { profile = VASE_PROFILES.amphora, material = mats.ceramic, scale = 1 } = {}) {
  const b = new Batcher();
  const geo = lathe(
    profile.map(([x, y]) => [x * scale, y * scale]),
    40,
  );
  b.add(geo, material, T());
  geo.dispose();
  const r = Math.max(...profile.map((p) => p[0])) * scale;
  return assemble('vase', b, mats, { decal: [r * 3, r * 3] });
}

/** One olive leaf: a slim diamond, length along +x from the stem. */
function pushLeaf(pos, origin, dir, side, len, wid) {
  const tip = origin.clone().addScaledVector(dir, len);
  const mid = origin.clone().addScaledVector(dir, len * 0.45);
  const a = mid.clone().addScaledVector(side, wid / 2);
  const c = mid.clone().addScaledVector(side, -wid / 2);
  for (const v of [origin, a, tip, origin, tip, c]) pos.push(v.x, v.y, v.z);
}

/**
 * A planted olive-style tree: lathe planter, soil, a tapered leaning trunk, branches to leaf
 * clusters, and ~700 seeded slim leaves merged into one mesh.
 * @param {Record<string, THREE.Material>} mats
 * @param {{planterProfile?: number[][], planter?: THREE.Material, height?: number, seed?: number}} [opts]
 */
export function plantedTree(
  mats,
  { planterProfile = PLANTER_PROFILES.drum, planter = mats.travertine, height = 3, seed = 0 } = {},
) {
  const rand = mulberry32(SCENE_SEED + 300 + seed);
  const b = new Batcher();
  const pot = lathe(planterProfile, 48);
  b.add(pot, planter, T());
  pot.dispose();

  // Soil sits just below the inner rim (last profile point).
  const soilY = planterProfile[planterProfile.length - 1][1] + 0.005;
  const soilR = planterProfile[planterProfile.length - 2][0];
  const soil = new THREE.CircleGeometry(soilR, 32).rotateX(-Math.PI / 2);
  b.add(soil, mats.soil, T(0, soilY, 0));
  soil.dispose();

  const bark = mats.walnut;
  const trunkTop = soilY + height * 0.48;
  const lean = (rand() - 0.5) * 0.2;
  const trunkPts = [
    [0, soilY - 0.05, 0],
    [0.05 + lean * 0.3, soilY + height * 0.16, 0.02],
    [-0.04 + lean, soilY + height * 0.33, -0.03],
    [lean * 1.5, trunkTop, 0.02],
  ];
  const trunk = taperedTube(trunkPts, 0.075, 0.04, { tubularSegments: 20, radialSegments: 8 });
  b.add(trunk, bark, T());
  trunk.dispose();

  const leaves = [];
  const clusters = 9;
  const top = new THREE.Vector3(trunkPts[3][0], trunkTop, trunkPts[3][2]);
  const crownR = height * 0.28;
  const o = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let c = 0; c < clusters; c++) {
    const ang = (c / clusters) * Math.PI * 2 + rand() * 0.6;
    const rr = crownR * (0.45 + rand() * 0.55);
    const centre = new THREE.Vector3(
      top.x + Math.cos(ang) * rr,
      trunkTop + height * (0.12 + rand() * 0.28),
      top.z + Math.sin(ang) * rr,
    );
    if (c === clusters - 1) centre.set(top.x, trunkTop + height * 0.42, top.z);
    // Branch from the trunk top to the cluster centre, with a slight upward bow.
    const midB = top.clone().lerp(centre, 0.5).add(new THREE.Vector3(0, 0.08, 0));
    const branch = taperedTube([top.toArray(), midB.toArray(), centre.toArray()], 0.032, 0.012, {
      tubularSegments: 8,
      radialSegments: 5,
    });
    b.add(branch, bark, T());
    branch.dispose();

    const cr = height * (0.13 + rand() * 0.06);
    for (let i = 0; i < 160; i++) {
      // Point in a flattened ellipsoid around the cluster centre.
      const u = rand() * Math.PI * 2;
      const v = Math.acos(2 * rand() - 1);
      const k = Math.cbrt(rand());
      o.set(Math.sin(v) * Math.cos(u) * cr * k, Math.cos(v) * cr * 0.7 * k, Math.sin(v) * Math.sin(u) * cr * k).add(centre);
      // Leaves point outward and droop a little; the blade plane is random about that axis.
      dir.copy(o).sub(centre).normalize();
      dir.y -= 0.35;
      dir.x += (rand() - 0.5) * 0.8;
      dir.z += (rand() - 0.5) * 0.8;
      dir.normalize();
      side.crossVectors(dir, up).normalize();
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      side.applyAxisAngle(dir, (rand() - 0.5) * 1.6);
      pushLeaf(leaves, o, dir, side, 0.16 + rand() * 0.07, 0.045);
    }
  }
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.Float32BufferAttribute(leaves, 3));
  leafGeo.computeVertexNormals();
  b.add(leafGeo, mats.leaf, T());
  leafGeo.dispose();

  const r = planterProfile.reduce((m, p) => Math.max(m, p[0]), 0);
  return assemble('planted-tree', b, mats, { decal: [r * 2.6, r * 2.6] });
}

const BOOK_TONES = ['#E8E1D3', '#2A2A26', '#5B6634', '#8A4B2E', '#B9A88C', '#3F4A3C', '#C9BBA0'];

/**
 * Books as one InstancedMesh with per-book cloth colours (paper, ink, olive, rust): a flat
 * stack, or an upright row along x. `userData.top` is the stack height.
 * @param {Record<string, THREE.Material>} mats
 * @param {{count?: number, seed?: number, upright?: boolean}} [opts]
 */
export function books(mats, { count = 4, seed = 0, upright = false } = {}) {
  const rand = mulberry32(SCENE_SEED + 500 + seed);
  const material = derived(mats, 'bookCloth', () => new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.82 }));
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, count);
  const color = new THREE.Color();
  const items = [];
  let y = 0;
  let x = 0;
  for (let i = 0; i < count; i++) {
    const tone = BOOK_TONES[Math.floor(rand() * BOOK_TONES.length)];
    if (upright) {
      const t = 0.022 + 0.02 * rand();
      const h = 0.2 + 0.07 * rand();
      const d = 0.15 + 0.04 * rand();
      items.push({ m: [x + t / 2, h / 2, 0, 0, 0, [t, h, d]], tone });
      x += t + 0.002;
    } else {
      const w = 0.2 + 0.1 * rand();
      const d = 0.15 + 0.08 * rand();
      const t = 0.022 + 0.025 * rand();
      items.push({ m: [(rand() - 0.5) * 0.02, y + t / 2, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.24, 0, [w, t, d]], tone });
      y += t;
    }
  }
  items.forEach(({ m: [px, py, pz, ry, rz, s], tone }, i) => {
    mesh.setMatrixAt(i, T(upright ? px - x / 2 : px, py, pz, 0, ry, rz, s));
    mesh.setColorAt(i, color.set(tone));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  const g = assemble('books', new Batcher(), mats, { cast: false, extra: [mesh] });
  g.userData.top = upright ? 0 : y;
  return g;
}

/**
 * Abstract canvas: three hand-cut tessera blocks (ink, olive, paper) on a warm linen ground.
 * No text. Pure, seeded; returns RGBA bytes.
 */
function artImage(w, h, rand) {
  const data = new Uint8Array(w * h * 4);
  const ground = [217, 208, 191];
  const blocks = [
    { c: [42, 42, 38], u0: 0.1, u1: 0.47, v0: 0.15, v1: 0.82 },
    { c: [91, 102, 52], u0: 0.53, u1: 0.9, v0: 0.47, v1: 0.85 },
    { c: [239, 233, 221], u0: 0.53, u1: 0.8, v0: 0.13, v1: 0.41 },
  ];
  // Smoothed per-row and per-column wobble so block edges look cut by hand.
  const wobble = (n) => {
    const raw = Array.from({ length: n }, () => rand() - 0.5);
    return raw.map((_, i) => (raw[Math.max(0, i - 2)] + raw[Math.max(0, i - 1)] + raw[i] + raw[Math.min(n - 1, i + 1)]) * 0.0025);
  };
  const rowW = wobble(h);
  const colW = wobble(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const v = (y + 0.5) / h;
      let c = ground;
      for (const k of blocks) {
        if (u > k.u0 + rowW[y] && u < k.u1 - rowW[y] && v > k.v0 + colW[x] && v < k.v1 - colW[x]) c = k.c;
      }
      const grain = (rand() - 0.5) * 10 + 4 * Math.sin(v * 90 + u * 7);
      const i = (y * w + x) * 4;
      data[i] = Math.max(0, Math.min(255, c[0] + grain));
      data[i + 1] = Math.max(0, Math.min(255, c[1] + grain));
      data[i + 2] = Math.max(0, Math.min(255, c[2] + grain));
      data[i + 3] = 255;
    }
  }
  return data;
}

/**
 * Framed artwork: 40 mm walnut frame with the abstract tessera canvas recessed 15 mm.
 * Origin on the wall plane at the frame centre; the frame projects along +z.
 * @param {Record<string, THREE.Material>} mats
 * @param {{w?: number, h?: number, seed?: number}} [opts]
 */
export function artFrame(mats, { w = 1.4, h = 1.0, seed = 0 } = {}) {
  const tw = 280;
  const th = 200;
  const tex = new THREE.DataTexture(artImage(tw, th, mulberry32(SCENE_SEED + 700 + seed)), tw, th);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  const canvas = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });

  const b = new Batcher();
  const f = 0.04;
  const depth = 0.045;
  const uv = { uvScale: 1 / 1.2 };
  for (const s of [-1, 1]) {
    b.add(worldBox(w, f, depth, uv), mats.walnut, T(0, s * (h / 2 - f / 2), depth / 2));
    b.add(worldBox(f, h - 2 * f, depth, uv), mats.walnut, T(s * (w / 2 - f / 2), 0, depth / 2));
  }
  b.add(new THREE.PlaneGeometry(w - 2 * f, h - 2 * f), canvas, T(0, 0, depth - 0.015));
  return assemble('art-frame', b, mats, { cast: false, mount: 'wall' });
}

/** Lathe pot profile [radius, height]: tapered cylinder with a rolled rim. */
const POT_PROFILE = [
  [0, 0],
  [0.15, 0],
  [0.17, 0.015],
  [0.185, 0.06],
  [0.2, 0.38],
  [0.205, 0.4],
  [0.185, 0.4],
  [0.18, 0.37],
  [0, 0.37],
];

/**
 * Fiddle-leaf style blade, length 1 along +z from the petiole at the origin: obovate outline,
 * cupped across the midrib and drooping toward the tip.
 */
function leafGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 4, 8);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const t = pos.getY(i) + 0.5;
    const outline = (Math.pow(Math.sin(Math.PI * t), 0.65) * (0.55 + 0.6 * t)) / 1.15;
    pos.setXYZ(i, u * 0.7 * outline, 0.09 * (2 * u) ** 2 * outline - 0.22 * t * t, t);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Potted plant: lathe pot, soil, tapered stems and `leaves` seeded curved leaves as one
 * InstancedMesh. `minX` keeps leaf tips on the +x side of a nearby wall or glass.
 * @param {Record<string, THREE.Material>} mats
 * @param {{height?: number, leaves?: number, seed?: number, pot?: THREE.Material, potScale?: number,
 *   leafSize?: number, stems?: number, spread?: number, minX?: number}} [opts]
 */
export function plant(
  mats,
  { height = 1.8, leaves = 120, seed = 0, pot = mats.ceramic, potScale = 1, leafSize = 0.28, stems = 3, spread = 0.3, minX = -Infinity } = {},
) {
  const rand = mulberry32(SCENE_SEED + 600 + seed);
  const b = new Batcher();
  const prof = POT_PROFILE.map(([x, y]) => [x * potScale, y * potScale]);
  const potGeo = lathe(prof, 40);
  b.add(potGeo, pot, T());
  potGeo.dispose();
  const soilY = prof[prof.length - 1][1] + 0.005;
  const soil = new THREE.CircleGeometry(prof[prof.length - 2][0], 28).rotateX(-Math.PI / 2);
  b.add(soil, mats.soil, T(0, soilY, 0));
  soil.dispose();

  const curves = [];
  for (let s = 0; s < stems; s++) {
    const a = (s / stems) * Math.PI * 2 + rand() * 0.8;
    const l = spread * (0.3 + 0.7 * rand());
    const top = height * (0.8 + 0.2 * rand()) - leafSize * 0.3;
    const dx = Math.cos(a) * l;
    const dz = Math.sin(a) * l;
    const pts = [
      [0, soilY - 0.02, 0],
      [dx * 0.15, soilY + (top - soilY) * 0.35, dz * 0.15],
      [dx * 0.55, soilY + (top - soilY) * 0.75, dz * 0.55],
      [dx * 0.7, top, dz * 0.7],
    ];
    const stem = taperedTube(pts, 0.016 * Math.max(0.5, potScale), 0.006, { tubularSegments: 16, radialSegments: 6 });
    b.add(stem, mats.walnut, T());
    stem.dispose();
    curves.push(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))));
  }

  const leafGeo = leafGeometry();
  const mesh = new THREE.InstancedMesh(leafGeo, mats.leaf, leaves);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const color = new THREE.Color();
  for (let i = 0; i < leaves; i++) {
    const t = 0.3 + 0.7 * Math.sqrt(rand());
    curves[i % stems].getPoint(t, p);
    let yaw = rand() * Math.PI * 2;
    const elev = THREE.MathUtils.degToRad(12 + 40 * rand() + 18 * t);
    const s = leafSize * (0.7 + 0.45 * rand()) * (0.8 + 0.3 * t);
    if (p.x + Math.sin(yaw) * s * Math.cos(elev) < minX) yaw = -yaw;
    p.x += Math.sin(yaw) * 0.015;
    p.z += Math.cos(yaw) * 0.015;
    q.setFromEuler(e.set(-elev, yaw, (rand() - 0.5) * 0.6, 'YXZ'));
    m.compose(p, q, sc.setScalar(s));
    mesh.setMatrixAt(i, m);
    const k = 0.8 + 0.4 * rand();
    mesh.setColorAt(i, color.setRGB(k, k * (0.95 + 0.1 * rand()), k * 0.9));
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  const r = prof.reduce((acc, pt) => Math.max(acc, pt[0]), 0);
  return assemble('plant', b, mats, { decal: [r * 2.8, r * 2.8], extra: [mesh] });
}

/**
 * Sheer curtain stacked open: a wavy panel of paper linen (55 % opacity, double-sided) under a
 * slim bronze track. Origin on the ceiling plane; hangs down, folds across x, faces +z.
 * @param {Record<string, THREE.Material>} mats
 * @param {{width?: number, height?: number, folds?: number}} [opts]
 */
export function sheerCurtain(mats, { width = 0.75, height = 3.06, folds = 7 } = {}) {
  const sheer = derived(mats, 'sheer', () => {
    const m = mats.linenPaper.clone();
    m.transparent = true;
    m.opacity = 0.55;
    m.side = THREE.DoubleSide;
    m.depthWrite = false;
    return m;
  });
  const b = new Batcher();
  const g = new THREE.PlaneGeometry(width, height, folds * 8, 6);
  g.translate(0, -height / 2 - 0.03, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const drop = -pos.getY(i) / height; // 0 at the track, 1 at the hem
    pos.setZ(i, 0.035 * (1 + 0.15 * drop) * Math.sin(2 * Math.PI * folds * (x / width + 0.5)));
  }
  g.computeVertexNormals();
  b.add(g, sheer, T());
  g.dispose();
  b.add(roundedBox(width + 0.06, 0.03, 0.05, 0.008, 1), mats.bronze, T(0, -0.015, 0));
  return assemble('sheer-curtain', b, mats, { cast: false, mount: 'ceiling' });
}

/** Reeded door front in plan: half-round reeds of radius r on a 10 mm backing, y outward. */
function reededShape(len, r) {
  const n = Math.max(1, Math.floor(len / (2 * r)));
  const x0 = -n * r;
  const s = new THREE.Shape();
  s.moveTo(x0, -0.01);
  s.lineTo(x0, 0);
  for (let i = 0; i < n; i++) {
    const cx = x0 + r + 2 * r * i;
    for (let k = 1; k <= 5; k++) {
      const a = Math.PI - (k / 5) * Math.PI;
      s.lineTo(cx + r * Math.cos(a), r * Math.sin(a));
    }
  }
  s.lineTo(-x0, -0.01);
  s.closePath();
  return s;
}

/**
 * Low walnut media console: recessed ink plinth, two reeded doors with brass pulls and a
 * walnut top. Front faces +z; `userData.top` is the top height for styling objects.
 * @param {Record<string, THREE.Material>} mats
 * @param {{length?: number, height?: number, depth?: number}} [opts]
 */
export function mediaConsole(mats, { length = 1.3, height = 0.52, depth = 0.42 } = {}) {
  const b = new Batcher();
  const plinth = 0.08;
  const topT = 0.03;
  const bodyH = height - plinth - topT;
  const uv = { uvScale: 1 / 1.2 };
  b.add(new THREE.BoxGeometry(length - 0.1, plinth, depth - 0.1), mats.inkMetal, T(0, plinth / 2, -0.02));
  b.add(worldBox(length - 0.02, bodyH, depth - 0.04, uv), mats.walnut, T(0, plinth + bodyH / 2, -0.02));
  const front = depth / 2 - 0.04;
  const doorLen = (length - 0.03) / 2;
  const door = extrudeProfile(reededShape(doorLen, 0.015), bodyH - 0.01, 0);
  door.rotateX(Math.PI / 2); // shape y → +z (outward), extrusion → vertical
  for (const s of [-1, 1]) {
    b.add(door, mats.walnut, T(s * (doorLen / 2 + 0.004), plinth + bodyH / 2, front + 0.01));
    b.add(roundedBox(0.012, 0.14, 0.02, 0.005, 1), mats.brass, T(s * 0.035, plinth + bodyH * 0.6, front + 0.035));
  }
  door.dispose();
  b.add(worldBox(length + 0.01, topT, depth, uv), mats.walnut, T(0, height - topT / 2, 0));
  const g = assemble('media-console', b, mats, { decal: [length + 0.2, depth + 0.25] });
  g.userData.top = height;
  return g;
}

/**
 * Concrete trough planter with ornamental grass: ~`blades` instanced, seeded, arching blades.
 * @param {Record<string, THREE.Material>} mats
 * @param {{length?: number, depth?: number, height?: number, blades?: number, seed?: number}} [opts]
 */
export function grassPlanter(mats, { length = 1.0, depth = 0.5, height = 0.45, blades = 220, seed = 0 } = {}) {
  const rand = mulberry32(SCENE_SEED + 800 + seed);
  const b = new Batcher();
  const t = 0.04;
  const uv = { uvScale: 1 / 1.5 };
  for (const s of [-1, 1]) {
    b.add(worldBox(length, height, t, uv), mats.concrete, T(0, height / 2, s * (depth / 2 - t / 2)));
    b.add(worldBox(t, height, depth - 2 * t, uv), mats.concrete, T(s * (length / 2 - t / 2), height / 2, 0));
  }
  const soilY = height - 0.05;
  b.add(new THREE.BoxGeometry(length - 2 * t, 0.02, depth - 2 * t), mats.soil, T(0, soilY - 0.01, 0));

  const blade = new THREE.PlaneGeometry(1, 1, 1, 5);
  blade.translate(0, 0.5, 0);
  const pos = blade.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setXYZ(i, pos.getX(i) * 0.014 * (1 - 0.85 * y), y, 0.18 * y * y);
  }
  blade.computeVertexNormals();
  const grass = new THREE.InstancedMesh(blade, mats.leaf, blades);
  const color = new THREE.Color();
  const straw = new THREE.Color('#C9B98A');
  for (let i = 0; i < blades; i++) {
    const x = (rand() - 0.5) * (length - 2 * t - 0.04);
    const z = (rand() - 0.5) * (depth - 2 * t - 0.04);
    const h = 0.35 + 0.35 * rand();
    grass.setMatrixAt(i, T(x, soilY, z, (rand() - 0.5) * 0.5, rand() * Math.PI * 2, 0, [1, h, h]));
    const k = 0.85 + 0.35 * rand();
    color.setRGB(k, k, k * 0.92);
    if (rand() < 0.18) color.lerp(straw, 0.6);
    grass.setColorAt(i, color);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.instanceColor.needsUpdate = true;
  grass.castShadow = true;
  grass.receiveShadow = true;
  grass.computeBoundingSphere();
  return assemble('grass-planter', b, mats, { decal: [length + 0.2, depth + 0.2], extra: [grass] });
}
