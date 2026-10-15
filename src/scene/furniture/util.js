// Shared helpers for the furniture builders. No DOM use.

import * as THREE from 'three';
import { contactShadow } from '../geometry-kit.js';

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();

/** Matrix from a position, Euler rotation (radians, XYZ) and uniform or [x, y, z] scale. */
export function T(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  _p.set(x, y, z);
  _q.setFromEuler(_e.set(rx, ry, rz));
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]);
  else _s.set(s, s, s);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

/**
 * Wrap a filled Batcher in a furniture Group based at y = 0, with an optional contact-shadow
 * decal of `decal` = [w, d] metres. `extra` objects (instanced parts, nested decor) are added
 * as children.
 * @param {string} name
 * @param {import('../geometry-kit.js').Batcher} batcher
 * @param {Record<string, THREE.Material>} mats
 * @param {{decal?: [number, number] | null, cast?: boolean, mount?: 'wall' | 'ceiling', extra?: THREE.Object3D[]}} [opts]
 */
export function assemble(name, batcher, mats, { decal = null, cast = true, mount, extra = [] } = {}) {
  const g = new THREE.Group();
  g.name = name;
  batcher.build({ cast, receive: true }).forEach((m) => g.add(m));
  extra.forEach((o) => g.add(o));
  if (decal) g.add(contactShadow(decal[0], decal[1], mats));
  g.userData.furniture = true;
  if (mount) g.userData.mount = mount;
  return g;
}

const derivedCache = new WeakMap();

/** A material derived from the palette, created once per palette (disposed with the scene). */
export function derived(mats, key, make) {
  let map = derivedCache.get(mats);
  if (!map) {
    map = new Map();
    derivedCache.set(mats, map);
  }
  if (!map.has(key)) map.set(key, make());
  return map.get(key);
}

/** Square leg on y = 0..h tapering from `top` to `bottom` (side lengths in metres). */
export function taperedLeg(top, bottom, h) {
  const g = new THREE.BoxGeometry(1, h, 1);
  g.translate(0, h / 2, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = bottom + (top - bottom) * (pos.getY(i) / h);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i), pos.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A furniture group of instanced repeats (dining chairs, stools): one InstancedMesh per part,
 * plus one instanced contact-shadow decal. `items` are {x, y, z, ry?} in the parent's space.
 * @param {string} name
 * @param {{geometry: THREE.BufferGeometry, material: THREE.Material}[]} parts
 * @param {{x:number,y:number,z:number,ry?:number}[]} items
 * @param {Record<string, THREE.Material>} mats
 * @param {{decal?: [number, number] | null, cast?: boolean}} [opts]
 */
export function instancedSet(name, parts, items, mats, { decal = null, cast = true } = {}) {
  const g = new THREE.Group();
  g.name = name;
  const m = new THREE.Matrix4();
  const place = (geometry, material, list, opts) => {
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach((it, i) => {
      m.copy(T(it.x, it.y, it.z, 0, it.ry || 0, 0, it.s ?? 1));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = opts.cast;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    g.add(mesh);
    return mesh;
  };
  parts.forEach((p) => place(p.geometry, p.material, items, { cast }));
  if (decal) {
    const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const list = items.map((it) => ({ ...it, y: it.y + 0.004, s: [decal[0], 1, decal[1]] }));
    place(plane, mats.shadowDecal, list, { cast: false }).renderOrder = 1;
  }
  g.userData.furniture = true;
  return g;
}
