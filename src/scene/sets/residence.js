import * as THREE from 'three';
import { Batcher, roundedBox, worldBox, extrudeProfile, tube } from '../geometry-kit.js';
import { cladPanels, instancedGeometry } from './helpers.js';
import { colorTexture, roughnessTexture, repeated } from '../textures.js';
import { mulberry32, SCENE_SEED } from '../../lib/prng.js';
import { modularSofa, loungeChair, diningChairGeometry, barStoolGeometry, outdoorLounger } from '../furniture/seating.js';
import { marbleCoffeeTable, sideTable, diningTable, kitchenIsland, outdoorLowTable } from '../furniture/tables.js';
import { floorLamp, pendant, linearPendant } from '../furniture/lighting.js';
import { rug, books, vase, VASE_PROFILES, artFrame, plant, sheerCurtain, mediaConsole, grassPlanter } from '../furniture/decor.js';
import { T, instancedSet } from '../furniture/util.js';

// Level 34 sits at 34 × 3.5 m. The set is placed against the west face of the tower.
export const RESIDENCE_ORIGIN = new THREE.Vector3(-9, 34 * 3.5, 0);

/**
 * Room planes in local metres (finished floor y = 0). Local x: west is negative.
 * Glazing at x -3.75, inner wall faces at z ±3.0 and x 3.75, ceiling underside at H.
 */
export const ROOM = {
  H: 3.1,
  glassX: -3.75,
  eastX: 3.75,
  northZ: -3.0,
  southZ: 3.0,
  door: [-0.5, 1.7],
  edgeX: -6.15, // balcony edge (2.4 m deep)
};

/** Glazing mullion: 50 mm face × 120 mm deep with two shadow grooves, extruded to `h`. */
function mullionGeometry(h) {
  const w = 0.025;
  const d = 0.06;
  const g = 0.004;
  const s = new THREE.Shape();
  s.moveTo(-w, -d);
  s.lineTo(w, -d);
  s.lineTo(w, -0.012);
  s.lineTo(w - g, -0.012);
  s.lineTo(w - g, 0.012);
  s.lineTo(w, 0.012);
  s.lineTo(w, d);
  s.lineTo(-w, d);
  s.lineTo(-w, 0.012);
  s.lineTo(-w + g, 0.012);
  s.lineTo(-w + g, -0.012);
  s.lineTo(-w, -0.012);
  s.closePath();
  const geo = extrudeProfile(s, h, 0);
  geo.rotateX(-Math.PI / 2); // extrusion → up, shape y → -z
  geo.rotateY(Math.PI / 2); // face width along z, depth along x
  geo.translate(0, h / 2, 0);
  return geo;
}

/** Balcony side fin in plan: 2.4 × 0.3 m with vertical flutes on the inner (-y) face. */
function finShape(len, thick, r = 0.03, pitch = 0.12) {
  const s = new THREE.Shape();
  const x = len / 2;
  const y = thick / 2;
  s.moveTo(-x, y);
  s.lineTo(x, y);
  s.lineTo(x, -y);
  const n = Math.floor((len - 0.12) / pitch);
  const start = (n - 1) * pitch * 0.5;
  for (let i = 0; i < n; i++) {
    const cx = start - i * pitch;
    for (let k = 0; k <= 5; k++) {
      const a = (k / 5) * Math.PI;
      s.lineTo(cx + r * Math.cos(a), -y + r * Math.sin(a));
    }
  }
  s.lineTo(-x, -y);
  s.closePath();
  return s;
}

/**
 * Level 34 living room (7.5 × 6 m, 3.1 m ceiling) with west glazing, an open sliding door and
 * a 2.4 m balcony. Oak floor, walnut joinery, cove-lit ceiling, a furnished living, dining and
 * kitchen zone, and exactly three point lights (none cast shadows).
 */
export function createResidence(m) {
  const g = new THREE.Group();
  g.name = 'residence';
  g.position.copy(RESIDENCE_ORIGIN);
  const { H, glassX, eastX, northZ, southZ, edgeX } = ROOM;
  const rand = mulberry32(SCENE_SEED + 34);
  const solid = new Batcher(); // casts shadows
  const clear = new Batcher(); // glass, light sources: no shadows
  const wood = { uvScale: 1 / 1.2 };

  // --- Floor: engineered oak, 180 mm planks running east-west ---------------------------
  const floorMat = m.oak.clone();
  const fw = southZ - northZ;
  const fl = eastX - glassX;
  floorMat.map = repeated(colorTexture('oak'), fw / 1.44, fl / 2.88);
  floorMat.roughnessMap = repeated(roughnessTexture('oak'), fw / 1.44, fl / 2.88);
  const floorGeo = new THREE.PlaneGeometry(fw, fl).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  g.add(floor);
  // Structural slab under the room and balcony.
  solid.add(new THREE.BoxGeometry(eastX - edgeX, 0.3, fw + 0.6), m.concrete, T((eastX + edgeX) / 2, -0.18, 0));

  // --- Walls, skirting, ceiling with a perimeter LED cove -------------------------------
  const wallH = H + 0.3;
  for (const z of [northZ - 0.1, southZ + 0.1]) solid.add(new THREE.BoxGeometry(fl + 0.2, wallH, 0.2), m.plaster, T(0.1, wallH / 2, z));
  solid.add(new THREE.BoxGeometry(0.2, wallH, fw + 0.4), m.plaster, T(eastX + 0.1, wallH / 2, 0));
  const cove = 0.3;
  const fieldX1 = eastX - cove;
  const fieldZ = southZ - cove;
  solid.add(new THREE.BoxGeometry(fieldX1 - glassX, 0.3, 2 * fieldZ), m.plaster, T((glassX + fieldX1) / 2, H + 0.15, 0));
  // Cove slots run 0.2 m higher; their soffit is washed by the hidden strip.
  const coveWash = new THREE.MeshBasicMaterial({ color: '#EAD2B0' });
  for (const s of [-1, 1]) {
    clear.add(new THREE.PlaneGeometry(fl, cove).rotateX(Math.PI / 2), coveWash, T(0, H + 0.2, s * (fieldZ + cove / 2)));
    solid.add(new THREE.BoxGeometry(fl, 0.1, cove), m.plaster, T(0, H + 0.25, s * (fieldZ + cove / 2)));
    clear.add(new THREE.BoxGeometry(fieldX1 - glassX, 0.02, 0.02), m.ledStrip, T((glassX + fieldX1) / 2, H + 0.04, s * (fieldZ + 0.012)));
  }
  clear.add(new THREE.PlaneGeometry(cove, 2 * fieldZ).rotateX(Math.PI / 2), coveWash, T(fieldX1 + cove / 2, H + 0.2, 0));
  solid.add(new THREE.BoxGeometry(cove, 0.1, 2 * fieldZ), m.plaster, T(fieldX1 + cove / 2, H + 0.25, 0));
  clear.add(new THREE.BoxGeometry(0.02, 0.02, 2 * fieldZ), m.ledStrip, T(fieldX1 + 0.012, H + 0.04, 0));

  // 90 mm walnut skirting, 15 mm proud; broken at the door on the south wall.
  const sk = (len, x, z, alongZ = false) =>
    solid.add(alongZ ? worldBox(0.015, 0.09, len, wood) : worldBox(len, 0.09, 0.015, wood), m.walnut, T(x, 0.045, z));
  sk(0.8 - glassX, (glassX + 0.8) / 2, northZ + 0.0075);
  sk(2.5 - glassX, (glassX + 2.5) / 2, southZ - 0.0075);
  sk(eastX - 3.5, (3.5 + eastX) / 2, southZ - 0.0075);
  sk(fw, eastX - 0.0075, 0, true);

  // Six recessed downlights in the ceiling field, plus four in the balcony soffit.
  const lights = [];
  for (const x of [-2.6, -0.2, 2.2]) for (const z of [-0.3, 1.9]) lights.push({ x, y: H - 0.002, z });
  for (const z of [-2.1, -0.7, 0.7, 2.1]) lights.push({ x: (glassX + edgeX) / 2, y: H - 0.002, z });
  g.add(instancedGeometry(new THREE.CircleGeometry(0.045, 20).rotateX(Math.PI / 2), m.warmLight, lights));
  const bezel = new THREE.RingGeometry(0.045, 0.062, 24).rotateX(Math.PI / 2);
  for (const l of lights) clear.add(bezel, m.inkMetal, T(l.x, H - 0.001, l.z));
  bezel.dispose();

  // --- West glazing: slim bronze frames, fixed panes, slid-open door -------------------
  const [d0, d1] = ROOM.door;
  const mull = mullionGeometry(H);
  for (const z of [northZ + 0.025, -1.5, d0, d1, southZ - 0.025]) solid.add(mull, m.bronze, T(glassX, 0, z));
  mull.dispose();
  solid.add(roundedBox(0.12, 0.06, fw, 0.004, 1), m.bronze, T(glassX, H - 0.03, 0));
  solid.add(roundedBox(0.12, 0.025, fw, 0.004, 1), m.bronze, T(glassX, 0.0125, 0));
  for (const [z0, z1] of [
    [northZ + 0.05, -1.5],
    [-1.5, d0],
    [d1, southZ - 0.05],
  ]) {
    clear.add(new THREE.BoxGeometry(0.012, H - 0.09, z1 - z0 - 0.05), m.lowIron, T(glassX, H / 2 + 0.0, (z0 + z1) / 2));
  }
  // Sliding leaf parked behind the fixed panes on its own track, in a slim bronze frame.
  const leafX = glassX + 0.09;
  const leafZ0 = d0 - (d1 - d0);
  solid.add(new THREE.BoxGeometry(0.05, 0.02, d1 - northZ), m.bronze, T(leafX, 0.01, (northZ + d1) / 2));
  solid.add(new THREE.BoxGeometry(0.05, 0.04, d1 - northZ), m.bronze, T(leafX, H - 0.08, (northZ + d1) / 2));
  for (const z of [leafZ0 + 0.025, d0 - 0.025]) solid.add(new THREE.BoxGeometry(0.04, H - 0.12, 0.05), m.bronze, T(leafX, H / 2 - 0.04, z));
  for (const y of [0.05, H - 0.12]) solid.add(new THREE.BoxGeometry(0.04, 0.05, d1 - d0), m.bronze, T(leafX, y, (leafZ0 + d0) / 2));
  clear.add(new THREE.BoxGeometry(0.012, H - 0.2, d1 - d0 - 0.08), m.lowIron, T(leafX, H / 2 - 0.04, (leafZ0 + d0) / 2));

  // --- South wall door: walnut casing and flush walnut leaf, brass lever ----------------
  const doorX = 3.0;
  solid.add(worldBox(0.9, 2.4, 0.02, wood), m.walnut, T(doorX, 1.2, southZ - 0.01));
  for (const s of [-1, 1]) solid.add(worldBox(0.05, 2.45, 0.03, wood), m.walnut, T(doorX + s * 0.475, 1.225, southZ - 0.015));
  solid.add(worldBox(1.0, 0.05, 0.03, wood), m.walnut, T(doorX, 2.425, southZ - 0.015));
  const lever = tube(
    [
      [doorX - 0.36, 1.02, southZ - 0.02],
      [doorX - 0.36, 1.02, southZ - 0.07],
      [doorX - 0.24, 1.02, southZ - 0.07],
    ],
    0.009,
    { tubularSegments: 12, radialSegments: 8 },
  );
  solid.add(lever, m.brass);
  lever.dispose();

  // --- Kitchen run on the north wall (x 0.8..3.75) --------------------------------------
  const kx0 = 0.8;
  const kx1 = 3.0; // base run; tall units from here to the east wall
  const kd = 0.58;
  const kz = northZ + kd / 2;
  solid.add(new THREE.BoxGeometry(kx1 - kx0, 0.1, kd - 0.06), m.inkMetal, T((kx0 + kx1) / 2, 0.05, kz - 0.03));
  solid.add(new THREE.BoxGeometry(kx1 - kx0, 0.78, kd - 0.02), m.inkMetal, T((kx0 + kx1) / 2, 0.1 + 0.39, kz - 0.01));
  const fronts = 4;
  const fwid = (kx1 - kx0) / fronts;
  for (let i = 0; i < fronts; i++) {
    solid.add(worldBox(fwid - 0.004, 0.776, 0.02, { ...wood, u0: i * 0.3 }), m.walnut, T(kx0 + (i + 0.5) * fwid, 0.1 + 0.39, northZ + kd - 0.01));
  }
  solid.add(worldBox(kx1 - kx0, 0.03, kd + 0.04, { uvScale: 1 / 1.6 }), m.marble, T((kx0 + kx1) / 2, 0.895, kz + 0.02));
  solid.add(worldBox(kx1 - kx0, 0.6, 0.02, { uvScale: 1 / 1.6, u0: 0.4 }), m.marble, T((kx0 + kx1) / 2, 0.91 + 0.3, northZ + 0.01));
  clear.add(new THREE.BoxGeometry(0.5, 0.004, 0.38), m.inkMetal, T(1.6, 0.912, kz + 0.04)); // sink
  clear.add(new THREE.BoxGeometry(0.6, 0.004, 0.5), m.smokedGlass, T(2.45, 0.912, kz + 0.03)); // hob
  const tap = tube(
    [
      [1.6, 0.91, northZ + 0.08],
      [1.6, 1.2, northZ + 0.08],
      [1.6, 1.29, northZ + 0.16],
      [1.6, 1.23, northZ + 0.27],
    ],
    0.011,
    { tubularSegments: 24, radialSegments: 8 },
  );
  solid.add(tap, m.brass);
  tap.dispose();
  // Tall walnut units to the ceiling with brass pulls.
  const tw = eastX - kx1;
  solid.add(new THREE.BoxGeometry(tw, 0.1, kd - 0.06), m.inkMetal, T(kx1 + tw / 2, 0.05, kz - 0.03));
  for (const s of [-1, 1]) {
    solid.add(worldBox(tw / 2 - 0.004, H - 0.12, 0.6, { ...wood, flip: s > 0 }), m.walnut, T(kx1 + tw / 2 + s * (tw / 4), 0.1 + (H - 0.12) / 2, kz + 0.01));
    solid.add(roundedBox(0.014, 0.5, 0.025, 0.006, 1), m.brass, T(kx1 + tw / 2 + s * 0.03, 1.1, northZ + 0.62));
  }

  // --- Balcony ---------------------------------------------------------------------------
  const bx = (glassX + edgeX) / 2;
  const bd = glassX - edgeX;
  const finIn = 2.9; // inner faces of the side fins
  // 600 mm travertine deck tiles on the slab, top at y = 0.
  cladPanels(solid, m.travertine, { axis: 'y', at: -0.03, dir: 1, a0: edgeX + 0.12, a1: glassX - 0.06, b0: -finIn, b1: finIn, pw: 0.6, ph: 0.6, gap: 0.004, t: 0.03 }, rand);
  // Slab edge with a drip groove line under it.
  solid.add(worldBox(0.12, 0.33, 2 * finIn, { uvScale: 1 / 1.5 }), m.concrete, T(edgeX + 0.06, -0.165, 0));
  solid.add(new THREE.BoxGeometry(0.02, 0.012, 2 * finIn + 0.6), m.concreteDark, T(edgeX + 0.05, -0.336, 0));
  // Soffit (the slab above) and its edge.
  solid.add(new THREE.BoxGeometry(bd + 0.1, 0.3, 2 * finIn + 0.6), m.concrete, T(bx - 0.05, H + 0.15, 0));
  solid.add(new THREE.BoxGeometry(0.02, 0.012, 2 * finIn + 0.6), m.concreteDark, T(edgeX + 0.05, H - 0.006, 0));
  // Fluted concrete side fins.
  const fin = extrudeProfile(finShape(bd, 0.3), H + 0.63, 0);
  fin.rotateX(-Math.PI / 2); // shape y → -z: the fluted face points +z
  for (const s of [-1, 1]) solid.add(fin, m.concrete, T(bx, -0.33 + (H + 0.63) / 2, s * (finIn + 0.15), 0, s > 0 ? Math.PI : 0, 0));
  fin.dispose();
  // Frameless low-iron balustrade: bronze shoe, 5 panels, standoffs, round cap rail at 1.1 m.
  const railX = edgeX + 0.09;
  solid.add(roundedBox(0.1, 0.1, 2 * finIn, 0.008, 1), m.bronze, T(railX, 0.05, 0));
  const pw = (2 * finIn) / 5;
  for (let i = 0; i < 5; i++) {
    const z = -finIn + (i + 0.5) * pw;
    clear.add(new THREE.BoxGeometry(0.015, 1.015, pw - 0.012), m.lowIron, T(railX, 0.06 + 0.5075, z));
    for (const dz of [-pw / 2 + 0.2, pw / 2 - 0.2]) {
      const stand = new THREE.CylinderGeometry(0.022, 0.022, 0.03, 16).rotateZ(Math.PI / 2);
      solid.add(stand, m.bronze, T(railX + 0.022, 0.86, z + dz));
      stand.dispose();
    }
  }
  const rail = tube(
    [
      [railX, 1.1, -finIn],
      [railX, 1.1, finIn],
    ],
    0.025,
    { tubularSegments: 1, radialSegments: 16 },
  );
  solid.add(rail, m.bronze);
  rail.dispose();

  solid.build({ cast: true, receive: true }).forEach((mesh) => g.add(mesh));
  clear.build({ cast: false, receive: true }).forEach((mesh) => g.add(mesh));

  // --- Furniture (layout per plan item 3; sofa faces north, camera looks west) -------------
  const place = (obj, x, y, z, ry = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.y = ry;
    g.add(obj);
    return obj;
  };
  const on = (parent, obj, x, z, ry = 0) => {
    obj.position.set(x, parent.userData.top, z);
    obj.rotation.y = ry;
    parent.add(obj);
    return obj;
  };

  const theRug = place(rug(m, { w: 3.2, d: 2.4 }), -0.7, 0, 1.4);
  const onRug = theRug.userData.top;
  place(modularSofa(m, { length: 3.0, depth: 0.88, fabric: m.linenOlive }), -0.9, onRug, southZ - 0.02 - 0.44, Math.PI);
  const coffee = place(marbleCoffeeTable(m), -0.9, onRug, 1.4);
  on(coffee, books(m, { count: 3, seed: 1 }), -0.3, 0.05, 0.2);
  on(coffee, vase(m, { profile: VASE_PROFILES.bowl, scale: 0.85 }), 0.25, -0.05);
  place(sideTable(m), 0.9, 0, 2.6);
  place(loungeChair(m), -1.9, 0, 0.2, Math.PI / 4);
  place(floorLamp(m, { reach: 0.85 }), -3.2, 0, 2.7, 2.155);
  place(artFrame(m, { w: 1.4, h: 1.0 }), -0.9, 1.75, southZ, Math.PI);

  const media = place(mediaConsole(m, { length: 1.3 }), 1.85, 0, southZ - 0.015 - 0.21, Math.PI);
  on(media, books(m, { count: 7, seed: 2, upright: true }), -0.38, 0);
  on(media, vase(m, { profile: VASE_PROFILES.bottle, scale: 1.1 }), 0.02, -0.04);
  on(media, vase(m, { profile: VASE_PROFILES.amphora, scale: 0.8 }), 0.2, 0.05);
  on(media, plant(m, { height: 0.42, leaves: 36, seed: 2, potScale: 0.45, leafSize: 0.11, stems: 4, spread: 0.12 }), 0.48, 0);

  // Dining for six by the glazing, long axis x; linear pendant above.
  const dining = { x: -1.9, z: -2.0 };
  const table = place(diningTable(m, { length: 2.2, width: 1.0 }), dining.x, 0, dining.z);
  on(table, vase(m, { profile: VASE_PROFILES.amphora, scale: 0.9 }), 0, 0);
  const chairs = [];
  for (const x of [-0.55, 0.55]) {
    chairs.push({ x: dining.x + x, y: 0, z: dining.z - 0.72, ry: 0 });
    chairs.push({ x: dining.x + x, y: 0, z: dining.z + 0.72, ry: Math.PI });
  }
  chairs.push({ x: dining.x - 1.35, y: 0, z: dining.z, ry: Math.PI / 2 });
  chairs.push({ x: dining.x + 1.35, y: 0, z: dining.z, ry: -Math.PI / 2 });
  g.add(instancedSet('dining-chairs', diningChairGeometry(m), chairs, m, { decal: [0.62, 0.62] }));
  place(linearPendant(m, { length: 1.4, drop: H - 2.25 }), dining.x, H, dining.z);

  // Kitchen island with three stools on its south side and two pendants.
  const island = { x: 2.3, z: -1.3 };
  const isl = place(kitchenIsland(m, { w: 2.4, d: 0.95 }), island.x, 0, island.z);
  on(isl, vase(m, { profile: VASE_PROFILES.bowl, scale: 1 }), -0.5, 0.1);
  const stools = [-0.75, 0, 0.75].map((dx) => ({ x: island.x + dx, y: 0, z: island.z + 0.68, ry: Math.PI }));
  g.add(instancedSet('bar-stools', barStoolGeometry(m), stools, m, { decal: [0.55, 0.55] }));
  for (const dx of [-0.6, 0.6]) place(pendant(m, { drop: H - 2.2, radius: 0.17 }), island.x + dx, H, island.z);

  place(plant(m, { height: 1.85, leaves: 120, seed: 1, potScale: 1, minX: -0.33 }), -3.3, 0, -0.9);
  // Sheers stacked at both ends of the glazing, facing into the room.
  place(sheerCurtain(m, { width: 0.7, folds: 7 }), glassX + 0.17, H, -2.65, Math.PI / 2);
  place(sheerCurtain(m, { width: 0.8, folds: 8 }), glassX + 0.17, H, 2.6, Math.PI / 2);

  // Balcony: two chaise loungers facing west with a low table between, grass troughs south.
  for (const z of [-2.4, -1.2]) place(outdoorLounger(m), -4.95, 0, z, -Math.PI / 2);
  place(outdoorLowTable(m), -4.5, 0, -1.8);
  place(grassPlanter(m, { length: 1.0, depth: 0.5, seed: 1 }), -4.4, 0, 2.65);
  place(grassPlanter(m, { length: 1.0, depth: 0.5, seed: 2 }), -5.45, 0, 2.65);

  // Exactly three point lights, no shadows: lamp glow, dining pendant, living fill.
  for (const [x, y, z, i, c] of [
    [-2.49, 1.62, 2.23, 2.5, '#FFC88A'],
    [dining.x, 2.1, dining.z, 3.5, '#FFD3A0'],
    [1.0, 2.7, 0.5, 8, '#FFE2BC'],
  ]) {
    const light = new THREE.PointLight(c, i, 0, 2);
    light.position.set(x, y, z);
    g.add(light);
  }
  return g;
}
