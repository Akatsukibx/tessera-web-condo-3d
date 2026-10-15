import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { createMaterials } from '../../src/scene/materials.js';
import { createResidence, RESIDENCE_ORIGIN, ROOM } from '../../src/scene/sets/residence.js';
import { createCameraRig } from '../../src/scene/camera-rig.js';

/**
 * Every furniture group, with `host` set for styling objects resting on another piece
 * (books and vases on the console, tables and island).
 */
function furnitureGroups(root) {
  const out = [];
  const walk = (o, host) => {
    if (o.userData.furniture) {
      out.push({ o, host });
      o.children.forEach((c) => walk(c, o));
    } else {
      o.children.forEach((c) => walk(c, host));
    }
  };
  root.children.forEach((c) => walk(c, null));
  return out;
}

/** World box of a furniture group's own meshes, excluding nested furniture groups. */
function ownBox(o) {
  const box = new THREE.Box3();
  const visit = (n) => {
    if (n !== o && n.userData.furniture) return;
    if (n.geometry) box.union(new THREE.Box3().setFromObject(n));
    n.children.forEach(visit);
  };
  visit(o);
  return box;
}

/** Horizontal (XZ) distance from a point to a box; 0 inside. */
function xzDistance(box, p) {
  const dx = Math.max(box.min.x - p.x, 0, p.x - box.max.x);
  const dz = Math.max(box.min.z - p.z, 0, p.z - box.max.z);
  return Math.hypot(dx, dz);
}

describe('residence layout', () => {
  let residence;
  let rig;
  let items; // { name, mount, box (local), hostTop (local y of the host's top) | null }

  beforeAll(() => {
    residence = createResidence(createMaterials());
    residence.updateMatrixWorld(true);
    rig = createCameraRig(RESIDENCE_ORIGIN);
    const shift = RESIDENCE_ORIGIN.clone().negate();
    items = furnitureGroups(residence).map(({ o, host }) => {
      const box = ownBox(o).translate(shift);
      const hostTop = host ? host.getWorldPosition(new THREE.Vector3()).y + shift.y + host.userData.top : null;
      return { name: o.name, mount: o.userData.mount, box, hostTop };
    });
  });

  const local = (v) => v.clone().sub(RESIDENCE_ORIGIN);

  it('furnishes the living, dining, kitchen and balcony zones', () => {
    const names = new Set(items.map((i) => i.name));
    for (const n of [
      'modular-sofa',
      'marble-coffee-table',
      'lounge-chair',
      'floor-lamp',
      'art-frame',
      'media-console',
      'dining-table',
      'dining-chairs',
      'kitchen-island',
      'bar-stools',
      'plant',
      'sheer-curtain',
      'outdoor-lounger',
      'grass-planter',
    ]) {
      expect(names.has(n), n).toBe(true);
    }
  });

  it('has exactly three point lights and none cast shadows', () => {
    const lights = [];
    residence.traverse((o) => o.isPointLight && lights.push(o));
    expect(lights).toHaveLength(3);
    expect(lights.every((l) => !l.castShadow)).toBe(true);
  });

  it('keeps every furniture piece 1.2 m clear of the chapter 3 and 4 camera positions', () => {
    for (const key of [rig.keys[2], rig.keys[3]]) {
      const p = local(key.pos);
      for (const it of items) {
        expect(it.box.distanceToPoint(p), `${it.name} near camera ${p.toArray()}`).toBeGreaterThanOrEqual(1.2);
      }
    }
  });

  it('keeps anything taller than 0.9 m out of a 0.6 m corridor along the living → balcony path', () => {
    const tall = items.filter((it) => it.box.max.y > 0.9);
    for (let i = 0; i <= 20; i++) {
      const p = local(rig.poseAt(2 + i / 20).pos);
      for (const it of tall) {
        expect(xzDistance(it.box, p), `${it.name} at p=${2 + i / 20}`).toBeGreaterThanOrEqual(0.6);
      }
    }
  });

  it('stands floor pieces on the floor and fixes wall and ceiling pieces to their planes', () => {
    for (const it of items) {
      if (it.hostTop !== null) {
        // Styling objects sit on their host's top surface.
        expect(Math.abs(it.box.min.y - it.hostTop), it.name).toBeLessThanOrEqual(0.02);
      } else if (it.mount === 'ceiling') {
        expect(Math.abs(it.box.max.y - ROOM.H), it.name).toBeLessThanOrEqual(0.03);
      } else if (it.mount === 'wall') {
        const gaps = [
          Math.abs(it.box.max.z - ROOM.southZ),
          Math.abs(it.box.min.z - ROOM.northZ),
          Math.abs(it.box.max.x - ROOM.eastX),
        ];
        expect(Math.min(...gaps), it.name).toBeLessThanOrEqual(0.03);
      } else {
        expect(Math.abs(it.box.min.y), it.name).toBeLessThanOrEqual(0.02);
      }
    }
  });
});
