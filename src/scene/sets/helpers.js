import * as THREE from 'three';
import { worldBox } from '../geometry-kit.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);

/** A box mesh sized in metres, centred at (x, y, z). Shares one unit geometry. */
export function box(material, w, h, d, x, y, z, { cast = false, receive = true } = {}) {
  const m = new THREE.Mesh(unitBox, material);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/**
 * Instanced copies of one geometry from {x, y, z, ry?, s?} entries (s: uniform or [x, y, z]).
 * @param {THREE.BufferGeometry} geometry
 * @param {THREE.Material} material
 * @param {{x:number,y:number,z:number,ry?:number,s?:number|number[]}[]} items
 */
export function instancedGeometry(geometry, material, items, { cast = false, receive = true } = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  items.forEach((it, i) => {
    p.set(it.x, it.y, it.z);
    q.setFromAxisAngle(up, it.ry || 0);
    if (Array.isArray(it.s)) s.set(it.s[0], it.s[1], it.s[2]);
    else s.setScalar(it.s ?? 1);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.computeBoundingSphere();
  return mesh;
}

/**
 * Stone cladding: a grid of separate panels with open joints, added to a Batcher.
 * `axis` is the face normal ('x', 'z', or 'y' for floors); `at` is the substrate plane and
 * `dir` the outward side. a0..a1 is the horizontal extent (z for 'x' faces, x otherwise);
 * b0..b1 is the vertical extent (or z for floors). Adjacent columns are book-matched.
 * @param {import('../geometry-kit.js').Batcher} batcher
 * @param {THREE.Material} material
 * @param {() => number} rand seeded
 */
export function cladPanels(
  batcher,
  material,
  { axis, at, dir = 1, a0, a1, b0, b1, pw = 1.2, ph = 0.6, gap = 0.012, t = 0.03, uvScale = 1 / 1.2 },
  rand,
) {
  const cols = Math.max(1, Math.round((a1 - a0) / pw));
  const rows = Math.max(1, Math.round((b1 - b0) / ph));
  const cw = (a1 - a0) / cols;
  const rh = (b1 - b0) / rows;
  const off = at + (dir * t) / 2;
  const m = new THREE.Matrix4();
  for (let r = 0; r < rows; r++) {
    let u0 = 0;
    let v0 = 0;
    for (let c = 0; c < cols; c++) {
      if (c % 2 === 0) {
        u0 = rand() * 8;
        v0 = rand() * 8;
      }
      const opts = { uvScale, u0, v0, flip: c % 2 === 1 };
      const a = a0 + (c + 0.5) * cw;
      const b = b0 + (r + 0.5) * rh;
      let geo;
      if (axis === 'x') {
        geo = worldBox(t, rh - gap, cw - gap, opts);
        m.makeTranslation(off, b, a);
      } else if (axis === 'z') {
        geo = worldBox(cw - gap, rh - gap, t, opts);
        m.makeTranslation(a, b, off);
      } else {
        geo = worldBox(cw - gap, t, rh - gap, opts);
        m.makeTranslation(a, off, b);
      }
      batcher.add(geo, material, m);
      geo.dispose();
    }
  }
}

/**
 * Instanced boxes from a list of {x,y,z,w,h,d} entries.
 * @param {THREE.Material} material
 * @param {{x:number,y:number,z:number,w:number,h:number,d:number}[]} items
 */
export function instancedBoxes(material, items, { cast = false, receive = true } = {}) {
  const mesh = new THREE.InstancedMesh(unitBox, material, items.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  items.forEach((it, i) => {
    p.set(it.x, it.y, it.z);
    s.set(it.w, it.h, it.d);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.computeBoundingSphere();
  return mesh;
}
