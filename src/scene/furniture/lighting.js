// Light-fitting builders. Ceiling pieces have their origin on the ceiling plane and hang
// down (-y); they are tagged userData.mount = 'ceiling'. No DOM use.

import * as THREE from 'three';
import { Batcher, lathe, tube, roundedBox } from '../geometry-kit.js';
import { dataTexture } from '../textures.js';
import { mulberry32, SCENE_SEED } from '../../lib/prng.js';
import { T, assemble, derived } from './util.js';

/** Slightly irregular hand-blown globe profile, bottom to top, centred on y = 0. */
function globeProfile(r, rand) {
  const pts = [];
  const wob = 0.025 + rand() * 0.02;
  const phase = rand() * Math.PI * 2;
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    const k = 1 + wob * Math.sin(3 * a + phase);
    pts.push([Math.max(0, Math.cos(a) * r * k), Math.sin(a) * r * (1 + wob * 0.5)]);
  }
  pts[0][0] = 0;
  pts[n][0] = 0.012; // neck opening at the rod
  return pts;
}

/**
 * Sculptural cluster pendant: `count` smoked-glass globes with glowing cores, each on a brass
 * rod from its own ceiling cup, hanging between `drop - 0.9` and `drop` below the ceiling.
 * @param {Record<string, THREE.Material>} mats
 * @param {{count?: number, drop?: number, spread?: number, seed?: number}} [opts]
 */
export function globePendant(mats, { count = 9, drop = 2.8, spread = 0.75, seed = 0 } = {}) {
  const rand = mulberry32(SCENE_SEED + 400 + seed);
  const b = new Batcher();
  const cup = lathe(
    [
      [0, -0.06],
      [0.03, -0.06],
      [0.045, -0.02],
      [0.045, 0],
      [0, 0],
    ],
    24,
  );
  const core = new THREE.IcosahedronGeometry(0.035, 1);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const rr = spread * Math.sqrt((i + 0.5) / count);
    const a = i * golden + rand() * 0.3;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const r = 0.13 + rand() * 0.07;
    // Outer globes hang higher, the centre lowest, with seeded variation.
    const y = -(drop - 0.9 * (rr / spread) - rand() * 0.15);
    b.add(cup, mats.brass, T(x, 0, z));
    const rod = tube(
      [
        [x, -0.05, z],
        [x, y + r * 0.95, z],
      ],
      0.005,
      { tubularSegments: 1, radialSegments: 6 },
    );
    b.add(rod, mats.brass, T());
    rod.dispose();
    const globe = lathe(globeProfile(r, rand), 32);
    b.add(globe, mats.smokedGlass, T(x, y, z));
    globe.dispose();
    b.add(core, mats.ledStrip, T(x, y, z));
  }
  cup.dispose();
  core.dispose();
  return assemble('globe-pendant', b, mats, { cast: false, mount: 'ceiling' });
}

/** Lit linen for lamp shades: lets light through, so it carries a soft warm emissive. */
function shadeLinen(mats) {
  return derived(mats, 'shadeLinen', () =>
    new THREE.MeshStandardMaterial({
      color: '#EDE3D0',
      roughness: 1,
      roughnessMap: dataTexture('linen'),
      emissive: '#FFCB8E',
      emissiveIntensity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
}

/** Small brass ceiling cup lathe (origin on the ceiling plane, hangs down). */
function ceilingCup(r = 0.05, h = 0.03) {
  return lathe(
    [
      [0, -h],
      [r * 0.7, -h],
      [r, -h * 0.4],
      [r, 0],
      [0, 0],
    ],
    24,
  );
}

/**
 * Arc floor lamp: marble base, brass arc of `reach` metres along +z, and a linen drum shade
 * whose underside diffuser glows. The shade hangs between 1.68 and 1.9 m.
 * @param {Record<string, THREE.Material>} mats
 * @param {{reach?: number}} [opts]
 */
export function floorLamp(mats, { reach = 0.85 } = {}) {
  const b = new Batcher();
  const base = lathe(
    [
      [0, 0],
      [0.17, 0],
      [0.18, 0.01],
      [0.18, 0.03],
      [0.165, 0.042],
      [0, 0.042],
    ],
    40,
  );
  b.add(base, mats.marble, T());
  base.dispose();
  const arc = tube(
    [
      [0, 0.04, 0],
      [0, 0.9, 0],
      [0, 1.6, 0.03],
      [0, 1.96, reach * 0.24],
      [0, 2.06, reach * 0.55],
      [0, 2.0, reach * 0.85],
      [0, 1.93, reach],
    ],
    0.012,
    { tubularSegments: 64, radialSegments: 10 },
  );
  b.add(arc, mats.brass, T());
  arc.dispose();
  const socket = new THREE.CylinderGeometry(0.022, 0.022, 0.06, 16);
  b.add(socket, mats.brass, T(0, 1.9, reach));
  socket.dispose();
  const shade = lathe(
    [
      [0.21, 0],
      [0.2, 0.06],
      [0.17, 0.22],
      [0.03, 0.22],
    ],
    48,
  );
  b.add(shade, shadeLinen(mats), T(0, 1.68, reach));
  shade.dispose();
  const diffuser = new THREE.CircleGeometry(0.19, 32).rotateX(Math.PI / 2);
  b.add(diffuser, mats.ledStrip, T(0, 1.69, reach));
  diffuser.dispose();
  return assemble('floor-lamp', b, mats, { decal: [0.5, 0.5] });
}

/**
 * Dome pendant on a fine cable: brass (or ceramic) shell, pale inner face, glowing disc.
 * Origin on the ceiling plane; the rim sits `drop` below it.
 * @param {Record<string, THREE.Material>} mats
 * @param {{drop?: number, radius?: number, shell?: THREE.Material}} [opts]
 */
export function pendant(mats, { drop = 0.9, radius = 0.17, shell = mats.brass } = {}) {
  const b = new Batcher();
  const r = radius;
  const h = 0.21;
  const cup = ceilingCup();
  b.add(cup, mats.brass, T());
  cup.dispose();
  const cable = tube(
    [
      [0, -0.03, 0],
      [0, -drop + h, 0],
    ],
    0.003,
    { tubularSegments: 1, radialSegments: 6 },
  );
  b.add(cable, mats.inkMetal, T());
  cable.dispose();
  // Outer shell bottom → top (normals out), inner face top → bottom (normals in).
  const outer = [
    [r, 0],
    [r * 0.97, 0.05],
    [r * 0.8, 0.13],
    [r * 0.45, 0.19],
    [0.02, h],
    [0, h],
  ];
  const inner = outer.map(([x, y]) => [Math.max(0, x - 0.004), y - 0.004]).reverse();
  const o = lathe(outer, 40);
  const i = lathe(inner, 40);
  b.add(o, shell, T(0, -drop, 0));
  b.add(i, mats.ceramic, T(0, -drop, 0));
  o.dispose();
  i.dispose();
  const disc = new THREE.CircleGeometry(r * 0.62, 32).rotateX(Math.PI / 2);
  b.add(disc, mats.ledStrip, T(0, -drop + 0.035, 0));
  disc.dispose();
  return assemble('pendant', b, mats, { cast: false, mount: 'ceiling' });
}

/**
 * Linear pendant for the dining table: a slim bronze bar with an LED underside on two cables.
 * Origin on the ceiling plane; the bar bottom sits `drop` below it.
 * @param {Record<string, THREE.Material>} mats
 * @param {{length?: number, drop?: number}} [opts]
 */
export function linearPendant(mats, { length = 1.4, drop = 0.85 } = {}) {
  const b = new Batcher();
  const cup = ceilingCup(0.04, 0.02);
  for (const s of [-1, 1]) {
    const x = s * (length / 2 - 0.15);
    b.add(cup, mats.brass, T(x, 0, 0));
    const cable = tube(
      [
        [x, -0.02, 0],
        [x, -drop + 0.045, 0],
      ],
      0.0025,
      { tubularSegments: 1, radialSegments: 6 },
    );
    b.add(cable, mats.inkMetal, T());
    cable.dispose();
  }
  cup.dispose();
  b.add(roundedBox(length, 0.045, 0.07, 0.01, 2), mats.bronze, T(0, -drop + 0.0225, 0));
  b.add(new THREE.BoxGeometry(length - 0.04, 0.004, 0.036), mats.ledStrip, T(0, -drop - 0.001, 0));
  return assemble('linear-pendant', b, mats, { cast: false, mount: 'ceiling' });
}
