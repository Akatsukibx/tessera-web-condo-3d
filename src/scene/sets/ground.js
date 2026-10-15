import * as THREE from 'three';
import { instancedBoxes, instancedGeometry } from './helpers.js';
import { roundedBox, tube, worldBox } from '../geometry-kit.js';
import { colorTexture, roughnessTexture, dataTexture, repeated } from '../textures.js';

// River to the west: water x -910..-610, 6 m embankments on both banks.
const RIVER = { x0: -910, x1: -610, y: -1.2, bank: 6, top: 0.4 };
const ROAD = { z: 60, w: 26, len: 3200 };

function plane(material, w, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
}

/** Clone a palette material with its concrete maps tiled every `tile` metres over (w, d). */
function tiled(base, w, d, tile, extra = {}) {
  const mat = base.clone();
  mat.map = repeated(colorTexture('concrete'), w / tile, d / tile);
  mat.roughnessMap = repeated(roughnessTexture('concrete'), w / tile, d / tile);
  Object.assign(mat, extra);
  return mat;
}

/** Overlay planes sit a few cm above the base ground: push them forward in depth. */
const OVER = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };

/** Instanced copies of one geometry from a list of [x, y, z, rotY] entries. */
function instanced(geometry, material, spots, opts) {
  return instancedGeometry(
    geometry,
    material,
    spots.map(([x, y, z, ry = 0]) => ({ x, y, z, ry })),
    opts,
  );
}

/** Ground, Sathorn Road with kerbs, footpaths and lamps, the river, and Lumphini Park. */
export function createGround(m) {
  const g = new THREE.Group();
  g.name = 'ground';
  const { x0, x1, bank, top } = RIVER;

  // Base ground on either side of the river channel (no overlap with the water).
  const westW = 4000 + (x0 - bank);
  const eastW = 4000 - (x1 + bank);
  const paving = tiled(m.paving, 3200, 8000, 4);
  g.add(plane(paving, westW, 8000, -4000 + westW / 2, 0, 0));
  g.add(plane(paving, eastW, 8000, 4000 - eastW / 2, 0, 0));

  // Garden court paving, then Sathorn Road in asphalt, east–west south of the tower.
  g.add(plane(tiled(m.court, 80, 34, 2.4, OVER), 80, 34, 0, 0.01, 30));
  const asphalt = tiled(m.road, ROAD.len, ROAD.w, 3, { ...OVER, color: new THREE.Color('#4A4944') });
  g.add(plane(asphalt, ROAD.len, ROAD.w, 0, 0.02, ROAD.z));
  const dashes = [];
  for (let x = -400; x <= 400; x += 9) dashes.push({ x, y: 0.035, z: ROAD.z, w: 4, h: 0.02, d: 0.18 });
  g.add(instancedBoxes(m.court, dashes, { receive: true }));

  // Footpaths (3 m) behind kerbs on both sides of the road.
  const halfRoad = ROAD.w / 2;
  for (const side of [-1, 1]) {
    const z = ROAD.z + side * (halfRoad + 0.15 + 1.5);
    const path = new THREE.Mesh(worldBox(ROAD.len, 0.14, 3, { uvScale: 1 / 1.2 }), m.paving);
    path.position.set(0, 0.07, z);
    path.receiveShadow = true;
    g.add(path);
  }

  // Kerbs: 10 m precast lengths for ±600 m (fog hides the rest), both sides.
  const kerbs = [];
  for (const side of [-1, 1]) {
    const z = ROAD.z + side * (halfRoad + 0.15);
    for (let x = -595; x <= 595; x += 10) kerbs.push([x, 0.09, z]);
  }
  g.add(instanced(roundedBox(9.98, 0.18, 0.3, 0.03, 1), m.concrete, kerbs));

  // 30 street lamps: tube pole with an arm over the road, a housing and a glowing lens.
  const pole = tube(
    [
      [0, 0, 0],
      [0, 6.8, 0],
      [0, 8.0, 0.35],
      [0, 8.45, 1.4],
    ],
    0.075,
    { tubularSegments: 16, radialSegments: 6 },
  );
  const housing = roundedBox(0.32, 0.14, 0.8, 0.05, 1).clone().translate(0, 8.48, 1.7);
  const lens = new THREE.PlaneGeometry(0.24, 0.64).rotateX(Math.PI / 2).translate(0, 8.405, 1.7);
  const lamps = [];
  for (const side of [-1, 1]) {
    const z = ROAD.z + side * (halfRoad + 0.9);
    // Arms point toward the road centre (+z on the north kerb, -z on the south kerb).
    for (let i = 0; i < 15; i++) lamps.push([-280 + 40 * i + (side > 0 ? 20 : 0), 0.14, z, side < 0 ? 0 : Math.PI]);
  }
  g.add(instanced(pole, m.inkMetal, lamps, { cast: true }));
  g.add(instanced(housing, m.inkMetal, lamps));
  g.add(instanced(lens, m.warmLight, lamps));

  // River: low water between 6 m concrete embankments (promenades).
  const water = m.river.clone();
  water.color = new THREE.Color('#5C6B69');
  water.roughness = 0.06;
  water.metalness = 0;
  water.normalMap = repeated(dataTexture('waterNormal'), 40, 800);
  water.normalScale = new THREE.Vector2(0.35, 0.35);
  water.envMapIntensity = 1.3;
  g.add(plane(water, x1 - x0, 8000, (x0 + x1) / 2, RIVER.y, 0));

  const bankH = top - RIVER.y + 0.4;
  for (const x of [x0 - bank / 2, x1 + bank / 2]) {
    const wall = new THREE.Mesh(worldBox(bank, bankH, 8000, { uvScale: 1 / 4 }), m.concrete);
    wall.position.set(x, top - bankH / 2, 0);
    wall.receiveShadow = true;
    g.add(wall);
  }

  // Promenade lights every 12 m along both banks, ±1500 m.
  const posts = [];
  for (const x of [x0 - 1, x1 + 1]) {
    for (let z = -1500; z <= 1500; z += 12) posts.push([x, top, z]);
  }
  const post = new THREE.CylinderGeometry(0.06, 0.08, 3.4, 6).translate(0, 1.7, 0);
  const head = new THREE.IcosahedronGeometry(0.32, 0).translate(0, 3.55, 0);
  g.add(instanced(post, m.inkMetal, posts));
  g.add(instanced(head, m.warmLight, posts));

  // Lumphini Park to the north-east
  const park = m.planting.clone();
  Object.assign(park, OVER);
  g.add(plane(park, 600, 520, 620, 0.03, -650));
  return g;
}
