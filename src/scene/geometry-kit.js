// Geometry helpers for sets and furniture, plus a per-material merge batcher. No DOM use.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cache = new Map();

const toV2 = (p) => (p.isVector2 ? p : new THREE.Vector2(p[0], p[1]));
const toV3 = (p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2]));

/** Cached rounded box, centred at the origin. Shared: do not mutate the result. */
export function roundedBox(w, h, d, r, segments = 3) {
  const key = `rb:${w}:${h}:${d}:${r}:${segments}`;
  if (!cache.has(key)) cache.set(key, new RoundedBoxGeometry(w, h, d, segments, r));
  return cache.get(key);
}

/**
 * Box with UVs in metres (1 UV unit = `uvScale` m⁻¹), so tiling textures keep their real size
 * whatever the box dimensions. `u0`/`v0` shift the pattern (per-panel variety) and `flip`
 * mirrors u (book-matched stone). Not cached: every call returns a new geometry.
 */
export function worldBox(w, h, d, { uvScale = 1, u0 = 0, v0 = 0, flip = false } = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let a;
    let b;
    if (Math.abs(nor.getY(i)) > 0.5) [a, b] = [x, z];
    else if (Math.abs(nor.getX(i)) > 0.5) [a, b] = [z, y];
    else [a, b] = [x, y];
    if (flip) a = -a;
    uv.setXY(i, (a + u0) * uvScale, (b + v0) * uvScale);
  }
  uv.needsUpdate = true;
  return g;
}

/** Lathe around +y from [x, y] (or Vector2) profile points. */
export function lathe(points, segs = 48) {
  return new THREE.LatheGeometry(points.map(toV2), segs);
}

/** Tube along a Catmull-Rom curve through [x, y, z] (or Vector3) points. */
export function tube(points, radius, { tubularSegments = 48, radialSegments = 12, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(toV3), closed);
  return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
}

/** A tube whose radius tapers linearly from `r0` at the first point to `r1` at the last. */
export function taperedTube(points, r0, r1, opts = {}) {
  const g = tube(points, r0, opts);
  const { path, tubularSegments, radialSegments } = g.parameters;
  const pos = g.attributes.position;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / (radialSegments + 1));
    const t = ring / tubularSegments;
    path.getPointAt(t, c);
    v.fromBufferAttribute(pos, i).sub(c).multiplyScalar(1 + (r1 / r0 - 1) * t).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Extrude a THREE.Shape (or [x, y] outline) by `depth` along z, centred on z = 0.
 * A bevel grows the outline by `bevel` on every side.
 */
export function extrudeProfile(shape, depth, bevel = 0) {
  const s = shape instanceof THREE.Shape ? shape : new THREE.Shape(shape.map(toV2));
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/**
 * A soft cushion: a rounded box whose top sinks by `sag` at the centre, following
 * sag * (1 - (2x/w)^2) * (1 - (2z/d)^2), fading to 0 at the bottom face.
 * The grid packs `round` rows into each rounded edge so the corners stay smooth.
 */
export function cushion(w, h, d, sag, { radius = Math.min(w, h, d) * 0.25, segments = 16, round = 3 } = {}) {
  const n = Math.max(segments, round * 2 + 2) + (Math.max(segments, round * 2 + 2) % 2);
  const ny = round * 2 + 2;
  const g = new THREE.BoxGeometry(w, h, d, n, ny, n);
  const pos = g.attributes.position;
  const half = [w / 2, h / 2, d / 2];
  const segs = [n, ny, n];
  const r = Math.min(radius, half[0], half[1], half[2]);
  const inner = half.map((e) => e - r);
  const p = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const v = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    // Remap the uniform grid: `round` segments per side cover the rounded band.
    for (let a = 0; a < 3; a++) {
      const e = half[a];
      const t = v[a] / e;
      const edge = 1 - (2 * round) / segs[a];
      const flat = inner[a] / e;
      const at = Math.abs(t);
      const m = at <= edge ? (at / edge) * flat : flat + ((at - edge) / (1 - edge)) * (1 - flat);
      v[a] = Math.sign(t) * m * e;
    }
    p.set(v[0], v[1], v[2]);
    c.set(
      THREE.MathUtils.clamp(p.x, -inner[0], inner[0]),
      THREE.MathUtils.clamp(p.y, -inner[1], inner[1]),
      THREE.MathUtils.clamp(p.z, -inner[2], inner[2]),
    );
    const off = p.clone().sub(c);
    if (off.lengthSq() > 0) p.copy(c).addScaledVector(off.normalize(), r);
    const fx = 1 - (2 * p.x / w) ** 2;
    const fz = 1 - (2 * p.z / d) ** 2;
    const k = THREE.MathUtils.clamp((p.y + h / 2) / h, 0, 1);
    p.y -= sag * Math.max(0, fx) * Math.max(0, fz) * k;
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** Soft contact-shadow decal (w x d) just above y = 0 of its parent. Uses mats.shadowDecal. */
export function contactShadow(w, d, mats) {
  const key = 'decal';
  if (!cache.has(key)) cache.set(key, new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  const m = new THREE.Mesh(cache.get(key), mats.shadowDecal);
  m.scale.set(w, 1, d);
  m.position.y = 0.004;
  m.renderOrder = 1;
  m.userData.decal = true;
  return m;
}

/** Drop every cached geometry (after the scene has disposed them). */
export function clearGeometryCache() {
  cache.forEach((g) => g.dispose());
  cache.clear();
}

/**
 * Collects (geometry, material, matrix) parts and merges them into one Mesh per material.
 * Inputs are cloned, so shared or cached geometries are safe to add.
 */
export class Batcher {
  constructor() {
    /** @type {Map<THREE.Material, THREE.BufferGeometry[]>} */
    this.parts = new Map();
  }

  /**
   * @param {THREE.BufferGeometry} geometry
   * @param {THREE.Material} material
   * @param {THREE.Matrix4} [matrix]
   */
  add(geometry, material, matrix) {
    const g = geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.morphAttributes = {};
    g.clearGroups();
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(g);
    return this;
  }

  /**
   * Merge and return one Mesh per material, then reset the batcher.
   * @returns {THREE.Mesh[]}
   */
  build({ cast = true, receive = true } = {}) {
    const meshes = [];
    for (const [material, list] of this.parts) {
      const indexed = list.map((g) => g.index !== null);
      const mixed = indexed.some((x) => x) && indexed.some((x) => !x);
      const ready = mixed
        ? list.map((g) => {
            if (!g.index) return g;
            const flat = g.toNonIndexed();
            g.dispose();
            return flat;
          })
        : list;
      const merged = ready.length === 1 ? ready[0] : mergeGeometries(ready, false);
      if (ready.length > 1) ready.forEach((g) => g.dispose());
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      meshes.push(mesh);
    }
    this.parts.clear();
    return meshes;
  }
}
