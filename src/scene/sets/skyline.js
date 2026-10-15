import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32, SCENE_SEED } from '../../lib/prng.js';

const COUNT = 700;
// West-view wedge: rooftops stay below the balcony → river sightline (camera ~120 m up,
// near bank ~610 m out), so the river reads from chapter 4.
const WEDGE_MAX_D = 540;
export const wedgeCap = (d) => Math.max(8, 96 * (1 - d / 600));
export const inWestWedge = (x, z) => x < -100 && Math.abs(z) < 0.5 * Math.abs(x);

// Chapter 1 street camera (x, z). The tower top sits 49° above it.
export const C1 = { x: 62, z: 110 };
export const HERO_RADIUS = 600;
/**
 * Height cap that keeps Tessera Sathorn the dominant tower in chapter 1:
 * (a) every block subtends at most 60 % of the tower's elevation angle from the street camera
 * (tan 29.4° ≈ 0.56), and (b) blocks within 600 m of the tower stay at or below 88 m (60 % of 148 m).
 */
export function heroCap(x, z, w, d) {
  const dc = Math.hypot(x - C1.x, z - C1.z) - 0.5 * Math.hypot(w, d);
  let cap = 1.7 + Math.max(0, dc) * 0.56;
  if (Math.hypot(x, z) < HERO_RADIUS) cap = Math.min(cap, 88);
  return cap;
}

/**
 * Pure, seeded block layout on a ring around the site. Keeps the river corridor, the park and
 * Sathorn Road open, and keeps the west wedge low. No THREE objects and no DOM.
 * @param {() => number} rand
 * @returns {{x:number,z:number,w:number,d:number,h:number,rot:number,tone:number,variant:0|1}[]}
 */
export function placeBlocks(rand) {
  const blocks = [];
  let guard = 0;
  while (blocks.length < COUNT && guard++ < 20000) {
    const r = 180 + Math.pow(rand(), 0.8) * 1020;
    const theta = rand() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const w = 14 + rand() * 26;
    const d = 14 + rand() * 26;
    let h = 20 + Math.pow(rand(), 2.2) * 200;
    const rot = (rand() - 0.5) * 0.3;
    let tone = rand();
    const variant = rand() < 0.4 ? 1 : 0;
    if (x < -580 && x > -940) continue; // river corridor
    if (x > 300 && x < 920 && z < -380 && z > -920) continue; // park
    if (Math.abs(z - 60) < 22 && Math.abs(x) < 1300) continue; // Sathorn Road
    if (inWestWedge(x, z)) {
      const dist = Math.hypot(x, z);
      if (dist > WEDGE_MAX_D) continue;
      h = Math.min(h, wedgeCap(dist));
    }
    // Keep the hero tower dominant: lower nearby blocks and lean them toward the darker tone.
    h = Math.min(h, heroCap(x, z, w, d));
    if (Math.hypot(x, z) < HERO_RADIUS) tone = 0.55 + 0.45 * tone;
    blocks.push({ x, z, w, d, h, rot, tone, variant: h > 40 ? variant : 0 });
  }
  return blocks;
}

/**
 * Deterministic facade textures at 2x: an albedo map (pale spandrels, dark glass, mullions)
 * and an emissive map of lit windows. The outer margin is dark so roofs sample one texel.
 */
function facadeTextures(rand) {
  const cols = 10;
  const rows = 28;
  const cw = 24;
  const ch = 18;
  const margin = 8;
  const W = cols * cw + margin * 2;
  const H = rows * ch + margin * 2;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return [c, c.getContext('2d')];
  };
  const [albedo, a] = make();
  const [glow, e] = make();
  a.fillStyle = '#6E6A63';
  a.fillRect(0, 0, W, H);
  a.fillStyle = '#C9C4BA';
  a.fillRect(margin, margin, cols * cw, rows * ch);
  e.fillStyle = '#000';
  e.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = margin + c * cw + 3;
      const y = margin + r * ch + 3;
      const w = cw - 6;
      const h = ch - 6;
      // Glass pane with a centre mullion and a transom.
      a.fillStyle = '#3B3B38';
      a.fillRect(x, y, w, h);
      a.fillStyle = '#8C877D';
      a.fillRect(x + w / 2 - 1, y, 2, h);
      a.fillRect(x, y + 4, w, 1);
      if (rand() < 0.34) {
        const b = 110 + Math.floor(rand() * 145);
        e.fillStyle = `rgb(${b},${b},${Math.round(b * 0.92)})`;
        e.fillRect(x, y, w, h);
        e.fillStyle = '#000';
        e.fillRect(x + w / 2 - 1, y, 2, h);
        e.fillRect(x, y + 4, w, 1);
      }
    }
  }
  const tex = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: tex(albedo), emissiveMap: tex(glow) };
}

/** Unit-height box on y = 0 whose roof and base sample the dark margin. */
function boxPart(sx, sy, sz, y0) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(0, y0 + sy / 2, 0);
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z; four vertices each.
  for (let i = 0; i < 24; i++) {
    if (i >= 8 && i < 16) uv.setXY(i, 0.005, 0.005);
    else uv.setY(i, pos.getY(i)); // rows follow height so tiers share the window grid
  }
  uv.needsUpdate = true;
  return g;
}

function plainGeometry() {
  return boxPart(1, 1, 1, 0);
}

/** A podium-and-tower block: the top fifth steps back to 70 % of the footprint. */
function setbackGeometry() {
  const parts = [boxPart(1, 0.8, 1, 0), boxPart(0.7, 0.2, 0.7, 0.8)];
  const g = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return g;
}

/**
 * ~700 instanced blocks in two variants. Emissive intensity is driven by index.js through
 * `userData.glowMaterials`.
 * @param {THREE.Texture|null} [envMap] dusk environment, so facades pick up the sky
 */
export function createSkyline(envMap = null) {
  const blocks = placeBlocks(mulberry32(SCENE_SEED));
  const { map, emissiveMap } = facadeTextures(mulberry32(SCENE_SEED + 1));
  const material = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    map,
    roughness: 0.6,
    metalness: 0.1,
    envMap,
    emissive: '#F2C98A',
    emissiveMap,
    emissiveIntensity: 0.3,
  });

  const group = new THREE.Group();
  group.name = 'skyline';
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const a = new THREE.Color('#A39C90');
  const b = new THREE.Color('#615C54');

  [plainGeometry(), setbackGeometry()].forEach((geometry, variant) => {
    const list = blocks.filter((bk) => bk.variant === variant);
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach((bk, i) => {
      p.set(bk.x, 0, bk.z);
      q.setFromAxisAngle(up, bk.rot);
      s.set(bk.w, bk.h, bk.d);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      color.copy(a).lerp(b, bk.tone);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  });
  group.userData.glowMaterials = [material];
  return group;
}
