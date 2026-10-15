import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batcher, roundedBox, extrudeProfile, worldBox, taperedTube, lathe } from '../geometry-kit.js';
import { dataTexture, repeated } from '../textures.js';
import { cladPanels, instancedGeometry } from './helpers.js';
import { mulberry32, SCENE_SEED } from '../../lib/prng.js';

// Tower: 30 × 26 m footprint, 42 storeys, 148 m. South face (+z) faces Sathorn Road.
export const TOWER = { w: 30, d: 26, lobbyH: 7.2, bodyTop: 140, crownTop: 147.5, storey: 3.5 };

const ROWS = 38; // storeys between the lobby and the roof, as rows of the interior texture
const BAYS = 20; // 1.5 m bays across the 30 m width, matching the fin rhythm
// Recessed amenity storeys, as slab index above the lobby (levels 1–2 are the lobby, so index k
// is level k + 3): level 12 wellness, level 38 lounge. Matches the bands in src/content/tower.js.
const AMENITY = { wellness: 9, lounge: 35 };
const TEX_H = ROWS * TOWER.storey; // metres covered by the interior texture

/**
 * Seeded interior glow behind the glass: one row per storey, 1.5 m bays with mullions, units
 * of 2–4 bays that are dark or lit in three brightness tiers, some with sheer curtains, and
 * bright amenity floors.
 */
function interiorTexture() {
  const rand = mulberry32(SCENE_SEED + 7);
  const bw = 24;
  const rh = 30;
  const canvas = document.createElement('canvas');
  canvas.width = BAYS * bw;
  canvas.height = ROWS * rh;
  const g = canvas.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, canvas.width, canvas.height);
  const tiers = [0.42, 0.66, 0.92];
  for (let k = 0; k < ROWS; k++) {
    const top = (ROWS - 1 - k) * rh; // canvas y grows downward; row 0 is the lowest storey
    const y0 = top + 5; // slab and ceiling band stay dark
    const h = rh - 7;
    const amenity = k === AMENITY.wellness || k === AMENITY.lounge;
    let c = 0;
    while (c < BAYS) {
      const span = amenity ? BAYS : Math.min(BAYS - c, 2 + Math.floor(rand() * 3));
      const x0 = c * bw;
      const w = span * bw;
      const lit = amenity || rand() > 0.4;
      if (lit) {
        const t = amenity ? (k === AMENITY.lounge ? 0.95 : 0.8) : tiers[Math.floor(rand() * 3)];
        // Ceiling-lit room: brighter near the ceiling, darker toward the floor.
        const grad = g.createLinearGradient(0, y0, 0, y0 + h);
        const v = Math.round(255 * t);
        grad.addColorStop(0, `rgb(${v},${Math.round(v * 0.94)},${Math.round(v * 0.84)})`);
        grad.addColorStop(1, `rgb(${Math.round(v * 0.55)},${Math.round(v * 0.5)},${Math.round(v * 0.42)})`);
        g.fillStyle = grad;
        g.fillRect(x0, y0, w, h);
        // Furniture and planting silhouettes in the lower third.
        g.fillStyle = 'rgba(0,0,0,0.45)';
        const pieces = amenity ? span : 1 + Math.floor(rand() * 3);
        for (let i = 0; i < pieces; i++) {
          const px = x0 + rand() * (w - 10);
          const ph = h * (amenity ? 0.35 + rand() * 0.25 : 0.18 + rand() * 0.15);
          g.fillRect(px, y0 + h - ph, 6 + rand() * (amenity ? 10 : 18), ph);
        }
        // Sheer curtains on some units: a paler, flatter tone with soft folds.
        if (!amenity && rand() < 0.35) {
          const cover = w * (0.3 + rand() * 0.7);
          const cx = rand() < 0.5 ? x0 : x0 + w - cover;
          const cv = Math.round(255 * t * 0.72);
          g.fillStyle = `rgb(${cv},${Math.round(cv * 0.97)},${Math.round(cv * 0.92)})`;
          g.fillRect(cx, y0, cover, h);
          g.fillStyle = 'rgba(0,0,0,0.12)';
          for (let f = cx + 2; f < cx + cover; f += 4) g.fillRect(f, y0, 1.5, h);
        }
      } else if (rand() < 0.3) {
        // Unlit room with faint spill from a corridor.
        g.fillStyle = 'rgb(26,22,18)';
        g.fillRect(x0, y0, w, h);
      }
      c += span;
    }
    // Mullions every 1.5 m and a transom near the ceiling.
    g.fillStyle = '#000';
    for (let b = 0; b <= BAYS; b++) g.fillRect(b * bw - 1, top, 2, rh);
    g.fillRect(0, y0 + Math.round(h * 0.16), canvas.width, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Box for the lit interior volume. Side UVs follow world position (u across the 30 m width,
 * v up the storeys from `yRef`) so the interior texture lines up with the fins; roofs and
 * soffits sample the dark slab band.
 */
function interiorBox(w, h, d, y0, yRef = TOWER.lobbyH) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, y0 + h / 2, 0);
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(nor.getY(i)) > 0.5) {
      uv.setXY(i, 0.5, 0.999);
      continue;
    }
    const a = Math.abs(nor.getX(i)) > 0.5 ? pos.getZ(i) : pos.getX(i);
    uv.setXY(i, (a + TOWER.w / 2) / TOWER.w, (pos.getY(i) - yRef) / TEX_H);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Fluted precast fin section: 0.28 m at the face tapering to 0.24, 0.7 m deep, two flutes. */
function finShape() {
  const b = 0.015; // the extrude bevel grows the outline by this much
  const s = new THREE.Shape();
  const half0 = 0.14 - b;
  const half1 = 0.12 - b;
  const tip = 0.7 - b;
  const r = 0.02;
  // Flutes as explicit 5-segment half-circles (absarc would emit 24 points each).
  const flute = (cx) => {
    for (let i = 0; i <= 5; i++) {
      const a = (i / 5) * Math.PI;
      s.lineTo(cx + r * Math.cos(a), tip - r * Math.sin(a));
    }
  };
  s.moveTo(-half0, b);
  s.lineTo(half0, b);
  s.lineTo(half1, tip);
  flute(0.05);
  flute(-0.05);
  s.lineTo(-half1, tip);
  s.closePath();
  return s;
}

/** Vertical geometry from a plan shape: shape y points outward (-z before instance rotation). */
function verticalExtrude(shape, height, bevel) {
  const g = extrudeProfile(shape, height, bevel);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Rotation about y that turns local -z (outward) to face +z, +x, -z or -x. */
const FACE_ROT = { s: Math.PI, e: -Math.PI / 2, n: 0, w: Math.PI / 2 };

/** Jittered low-poly canopy: 5 icosahedra merged, vertices pushed by a seeded function. */
function treeCanopy(rand) {
  const parts = [];
  const blobs = [
    [0, 0, 0, 1.9],
    [1.1, -0.3, 0.4, 1.4],
    [-1.0, -0.1, -0.5, 1.5],
    [0.3, 0.7, -0.9, 1.3],
    [-0.4, 0.4, 1.0, 1.35],
  ];
  const f = [rand() * 3 + 2, rand() * 3 + 2, rand() * 3 + 2, rand() * 6];
  for (const [x, y, z, r] of blobs) {
    const geo = new THREE.IcosahedronGeometry(r, 1);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = v.clone().normalize();
      // Depends only on position, so shared corners move together (no cracks).
      const k = 1 + 0.16 * Math.sin(f[0] * n.x + f[3]) * Math.cos(f[1] * n.y) + 0.1 * Math.sin(f[2] * n.z + f[3]);
      v.multiplyScalar(k);
      pos.setXYZ(i, v.x + x, v.y * 0.85 + y, v.z + z);
    }
    geo.computeVertexNormals();
    parts.push(geo);
  }
  const g = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  g.translate(0, 5.6, 0);
  return g;
}

export function createExterior(m) {
  const g = new THREE.Group();
  g.name = 'exterior';
  const { w: W, d: D, lobbyH, bodyTop, crownTop, storey } = TOWER;
  const hw = W / 2;
  const hd = D / 2;
  const rand = mulberry32(SCENE_SEED + 21);

  const dark = new THREE.MeshStandardMaterial({ color: '#3A3732', roughness: 1 });
  const interior = new THREE.MeshStandardMaterial({
    color: '#2E2924',
    roughness: 0.9,
    emissive: '#F2C98A',
    emissiveMap: interiorTexture(),
    emissiveIntensity: 0.5,
  });
  interior.userData.glowBase = 0.5;

  const cast = new Batcher(); // static parts that cast sun shadows
  const flat = new Batcher(); // glass, lawn, glow: no shadow casting

  // --- Podium: travertine panels (1.2 × 0.6 m, open joints) on a dark substrate ------------
  const podium = [
    [-hw, -hw + 3, -hd, hd],
    [hw - 3, hw, -hd, hd],
    [-hw + 3, hw - 3, -hd, 0.5],
  ];
  for (const [x0, x1, z0, z1] of podium) {
    cast.add(new THREE.BoxGeometry(x1 - x0, lobbyH, z1 - z0), dark, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, lobbyH / 2, (z0 + z1) / 2));
  }
  const clad = (o) => cladPanels(cast, m.travertine, { b0: 0, b1: lobbyH, ...o }, rand);
  for (const s of [-1, 1]) {
    clad({ axis: 'x', at: s * hw, dir: s, a0: -hd, a1: hd }); // outer side faces
    clad({ axis: 'x', at: s * (hw - 3), dir: -s, a0: 0.5, a1: hd }); // lobby side walls
    clad({ axis: 'z', at: hd, dir: 1, a0: s > 0 ? hw - 3 : -hw, a1: s > 0 ? hw : -hw + 3 }); // street piers
  }

  // --- Body: lit interior behind bronze glass, recessed at the two amenity storeys --------
  const bodyH = bodyTop - lobbyH;
  const slabY = (k) => lobbyH + k * storey;
  const bands = [
    [lobbyH, slabY(AMENITY.wellness), false],
    [slabY(AMENITY.wellness), slabY(AMENITY.wellness + 1), true],
    [slabY(AMENITY.wellness + 1), slabY(AMENITY.lounge), false],
    [slabY(AMENITY.lounge), slabY(AMENITY.lounge + 1), true],
    [slabY(AMENITY.lounge + 1), bodyTop, false],
  ];
  for (const [y0, y1, recessed] of bands) {
    const h = y1 - y0;
    const inset = recessed ? 2 : 0; // 1 m set back on every side
    cast.add(interiorBox(W - 2.4 - inset, h, D - 2.4 - inset, y0), interior);
    flat.add(
      new THREE.BoxGeometry(W - 0.8 - inset, h, D - 0.8 - inset),
      m.glass,
      new THREE.Matrix4().makeTranslation(0, y0 + h / 2, 0),
    );
  }
  // Pool-edge LED line along the level 38 terrace.
  {
    const y = slabY(AMENITY.lounge) + 0.22;
    const ex = hw - 0.9;
    const ez = hd - 0.9;
    flat.add(new THREE.BoxGeometry(2 * ex, 0.04, 0.04), m.ledStrip, new THREE.Matrix4().makeTranslation(0, y, ez));
    flat.add(new THREE.BoxGeometry(2 * ex, 0.04, 0.04), m.ledStrip, new THREE.Matrix4().makeTranslation(0, y, -ez));
    flat.add(new THREE.BoxGeometry(0.04, 0.04, 2 * ez), m.ledStrip, new THREE.Matrix4().makeTranslation(ex, y, 0));
    flat.add(new THREE.BoxGeometry(0.04, 0.04, 2 * ez), m.ledStrip, new THREE.Matrix4().makeTranslation(-ex, y, 0));
  }

  // Floor slab edges: bevelled, with a dark drip line set back under each one.
  const slabs = [];
  for (let k = 0; slabY(k) <= bodyTop + 0.01; k++) slabs.push({ x: 0, y: slabY(k), z: 0 });
  slabs.push({ x: 0, y: bodyTop, z: 0 });
  g.add(instancedGeometry(roundedBox(W + 0.6, 0.35, D + 0.6, 0.06, 2), m.concrete, slabs, { cast: true }));
  // (None under the first slab: that is the lobby ceiling zone.)
  g.add(
    instancedGeometry(
      new THREE.BoxGeometry(W + 0.3, 0.12, D + 0.3),
      dark,
      slabs.slice(1).map((s) => ({ ...s, y: s.y - 0.175 - 0.06 })),
    ),
  );

  // Fluted precast fins at 1.5 m on all four faces.
  const finGeo = verticalExtrude(finShape(), bodyH, 0.015);
  const finY = lobbyH + bodyH / 2;
  const fins = [];
  for (let x = -hw; x <= hw + 0.01; x += 1.5) {
    fins.push({ x, y: finY, z: hd, ry: FACE_ROT.s });
    fins.push({ x, y: finY, z: -hd, ry: FACE_ROT.n });
  }
  for (let z = -hd + 1.5; z <= hd - 1.5 + 0.01; z += 1.5) {
    fins.push({ x: hw, y: finY, z, ry: FACE_ROT.e });
    fins.push({ x: -hw, y: finY, z, ry: FACE_ROT.w });
  }
  g.add(instancedGeometry(finGeo, m.concrete, fins, { cast: true }));

  // --- Crown (levels 41–42): glass box behind angled bronze louvres, parapet cap --------
  const cw = 24;
  const cd = 20;
  const crownH = crownTop - bodyTop;
  cast.add(interiorBox(cw - 1.6, crownH, cd - 1.6, bodyTop, bodyTop - 33 * storey), interior);
  flat.add(new THREE.BoxGeometry(cw - 0.4, crownH, cd - 0.4), m.glass, new THREE.Matrix4().makeTranslation(0, bodyTop + crownH / 2, 0));
  // Lens-section blade, 10-point outline, 0.07 × 0.44 m.
  const louvreShape = new THREE.Shape(
    Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return new THREE.Vector2(0.035 * Math.cos(a), 0.24 + 0.22 * Math.sin(a));
    }),
  );
  const louvreGeo = verticalExtrude(louvreShape, crownH - 0.1, 0.01);
  const louvres = [];
  const ly = bodyTop + crownH / 2;
  const tilt = 0.35;
  for (let x = -cw / 2 + 0.5; x <= cw / 2 - 0.5 + 0.01; x += 1) {
    louvres.push({ x, y: ly, z: cd / 2 + 0.05, ry: FACE_ROT.s + tilt });
    louvres.push({ x, y: ly, z: -cd / 2 - 0.05, ry: FACE_ROT.n + tilt });
  }
  for (let z = -cd / 2 + 0.5; z <= cd / 2 - 0.5 + 0.01; z += 1) {
    louvres.push({ x: cw / 2 + 0.05, y: ly, z, ry: FACE_ROT.e + tilt });
    louvres.push({ x: -cw / 2 - 0.05, y: ly, z, ry: FACE_ROT.w + tilt });
  }
  g.add(instancedGeometry(louvreGeo, m.bronze, louvres, { cast: true }));
  cast.add(roundedBox(cw + 1.2, 0.5, cd + 1.2, 0.06, 2), m.concrete, new THREE.Matrix4().makeTranslation(0, crownTop + 0.25, 0));
  cast.add(worldBox(10, 2.4, 8, { uvScale: 0.5 }), m.concreteDark, new THREE.Matrix4().makeTranslation(2, crownTop + 1.7, -2));

  // --- Entrance: double-height low-iron glazing in bronze frames, cantilever canopy ------
  flat.add(new THREE.BoxGeometry(24, lobbyH, 0.05), m.lowIron, new THREE.Matrix4().makeTranslation(0, lobbyH / 2, hd));
  for (let x = -12; x <= 12.01; x += 2.4) {
    cast.add(roundedBox(0.08, lobbyH, 0.18, 0.02, 1), m.bronze, new THREE.Matrix4().makeTranslation(x, lobbyH / 2, hd));
  }
  cast.add(new THREE.BoxGeometry(24, 0.08, 0.18), m.bronze, new THREE.Matrix4().makeTranslation(0, 3.4, hd));
  const canopy = { w: 14, d: 4, y: lobbyH - 0.4, z: hd + 2, t: 0.35 };
  cast.add(roundedBox(canopy.w, canopy.t, canopy.d, 0.05, 2), m.concrete, new THREE.Matrix4().makeTranslation(0, canopy.y, canopy.z));
  cast.add(roundedBox(canopy.w + 0.1, 0.44, 0.06, 0.02, 1), m.bronze, new THREE.Matrix4().makeTranslation(0, canopy.y, canopy.z + canopy.d / 2 + 0.03));
  for (const s of [-1, 1]) {
    cast.add(roundedBox(0.06, 0.44, canopy.d, 0.02, 1), m.bronze, new THREE.Matrix4().makeTranslation(s * (canopy.w / 2 + 0.03), canopy.y, canopy.z));
  }
  const soffit = [];
  for (let x = -5; x <= 5.01; x += 2) soffit.push({ x, y: canopy.y - canopy.t / 2 - 0.004, z: canopy.z + 0.5 });
  g.add(instancedGeometry(new THREE.CircleGeometry(0.13, 20).rotateX(Math.PI / 2), m.warmLight, soffit));

  // --- Garden court: lawns, clipped hedges, stone planters, reflecting pool -----------------
  const lawn = new THREE.MeshStandardMaterial({ color: '#66713F', roughness: 1 });
  // Lawns z 15.5..42.5, clear of the footpath (z ≥ 43.85).
  for (const [x0, x1] of [
    [-37, -2.5],
    [15.5, 37],
  ]) {
    flat.add(worldBox(x1 - x0, 0.06, 27, { uvScale: 0.5 }), lawn, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, 0.04, 29));
  }
  const hedge = (len, alongX, x, z) => {
    const geo = alongX ? roundedBox(len, 0.9, 0.8, 0.22, 2) : roundedBox(0.8, 0.9, len, 0.22, 2);
    cast.add(geo, m.planting, new THREE.Matrix4().makeTranslation(x, 0.45, z));
  };
  hedge(34.5, true, -19.75, 43);
  hedge(21.5, true, 26.25, 43);
  hedge(27, false, -37.6, 29);
  hedge(27, false, 37.6, 29);
  const planters = [
    { x: -9, z: 22, w: 9, d: 3 },
    { x: -9, z: 31, w: 9, d: 3 },
    { x: 23, z: 26, w: 3, d: 18 },
    { x: -20, z: 26, w: 3, d: 18 },
  ];
  for (const p of planters) {
    cast.add(worldBox(p.w, 0.6, p.d), m.stone, new THREE.Matrix4().makeTranslation(p.x, 0.3, p.z));
    cast.add(roundedBox(p.w - 0.5, 0.5, p.d - 0.5, 0.18, 2), m.planting, new THREE.Matrix4().makeTranslation(p.x, 0.75, p.z));
  }
  // Reflecting pool 12 × 3 m between the west planters: stone coping, dark basin, still water.
  const pool = { x: -9, z: 26.5, w: 12, d: 3 };
  const cope = 0.3;
  for (const s of [-1, 1]) {
    cast.add(worldBox(pool.w + 2 * cope, 0.3, cope), m.stone, new THREE.Matrix4().makeTranslation(pool.x, 0.15, pool.z + s * (pool.d / 2 + cope / 2)));
    cast.add(worldBox(cope, 0.3, pool.d), m.stone, new THREE.Matrix4().makeTranslation(pool.x + s * (pool.w / 2 + cope / 2), 0.15, pool.z));
  }
  cast.add(new THREE.BoxGeometry(pool.w, 0.1, pool.d), dark, new THREE.Matrix4().makeTranslation(pool.x, 0.05, pool.z));
  const poolWater = m.river.clone();
  poolWater.color = new THREE.Color('#3F4B49');
  poolWater.roughness = 0.03;
  poolWater.normalMap = repeated(dataTexture('waterNormal'), 2, 0.5);
  poolWater.normalScale = new THREE.Vector2(0.08, 0.08);
  poolWater.envMapIntensity = 1.4;
  flat.add(new THREE.PlaneGeometry(pool.w, pool.d).rotateX(-Math.PI / 2), poolWater, new THREE.Matrix4().makeTranslation(pool.x, 0.24, pool.z));

  cast.build({ cast: true, receive: true }).forEach((mesh) => g.add(mesh));
  flat.build({ cast: false, receive: true }).forEach((mesh) => g.add(mesh));

  // --- Trees: tapered trunks and jittered canopies, both instanced -------------------------
  const bark = new THREE.MeshStandardMaterial({ color: '#4B4339', roughness: 0.95 });
  const trunkGeo = taperedTube(
    [
      [0, -0.3, 0],
      [0.12, 1.6, 0.05],
      [-0.06, 3.3, 0.12],
      [0.05, 4.8, 0],
    ],
    0.2,
    0.09,
    { tubularSegments: 12, radialSegments: 8 },
  );
  const canopyGeo = treeCanopy(rand);
  const treeSpots = [
    [-12, 22],
    [-6, 31],
    [-20, 20],
    [-20, 32],
    [23, 19],
    [23, 27],
    [23, 34],
    [-12, 31],
  ];
  const trees = treeSpots.map(([x, z]) => ({ x, y: 0.6, z, ry: rand() * Math.PI * 2, s: 0.85 + rand() * 0.3 }));
  const canopies = instancedGeometry(canopyGeo, m.planting, trees, { cast: true });
  const tone = new THREE.Color();
  trees.forEach((_, i) => canopies.setColorAt(i, tone.setHSL(0.17 + rand() * 0.08, 0.3, 0.8 + rand() * 0.15)));
  canopies.instanceColor.needsUpdate = true;
  g.add(canopies);
  g.add(instancedGeometry(trunkGeo, bark, trees, { cast: true }));

  // --- 10 bollard lights along the entry walk ----------------------------------------------
  const bollardGeo = lathe(
    [
      [0, 0],
      [0.09, 0],
      [0.09, 0.72],
      [0.072, 0.74],
      [0.072, 0.86],
      [0.09, 0.88],
      [0.09, 0.92],
      [0.06, 0.94],
      [0, 0.94],
    ],
    20,
  );
  const bollards = [];
  for (const x of [-1.8, 14.8]) for (let z = 18; z <= 42; z += 6) bollards.push({ x, y: 0.01, z });
  g.add(instancedGeometry(bollardGeo, m.bronze, bollards, { cast: true }));
  g.add(instancedGeometry(new THREE.CylinderGeometry(0.074, 0.074, 0.11, 20, 1, true).translate(0, 0.8, 0), m.warmLight, bollards));

  g.userData.glowMaterials = [interior];
  return g;
}
