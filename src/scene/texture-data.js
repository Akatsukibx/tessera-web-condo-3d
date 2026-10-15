// Pure, seeded texture generators. No three.js and no DOM, so they run (and are tested) in node.
// Each returns { width, height, data: Uint8Array } in RGBA order. All patterns tile, except the
// rug (border band) and the contact shadow (radial falloff), which are used once per object.

import { mulberry32, SCENE_SEED } from '../lib/prng.js';

const N = 256;
const TAU = Math.PI * 2;

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrap = (i, p) => ((i % p) + p) % p;

/** 256x256 table of random values; the noise lattice. */
function makeLattice(rand) {
  const t = new Float32Array(N * N);
  for (let i = 0; i < t.length; i++) t[i] = rand();
  return t;
}

/**
 * Periodic value noise in [0, 1]. x repeats every px cells and y every py cells, so sampling
 * (u * px, v * py) with u, v in [0, 1) gives a seamless tile. `salt` decorrelates fields.
 */
function valueNoise(lat, x, y, px, py, salt = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let fx = x - xi;
  let fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const sx = salt * 31;
  const sy = salt * 57;
  const r0 = ((wrap(yi, py) + sy) & 255) * N;
  const r1 = ((wrap(yi + 1, py) + sy) & 255) * N;
  const c0 = (wrap(xi, px) + sx) & 255;
  const c1 = (wrap(xi + 1, px) + sx) & 255;
  const a = lat[r0 + c0];
  const b = lat[r0 + c1];
  const c = lat[r1 + c0];
  const d = lat[r1 + c1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Fractal sum of periodic value noise, normalised to [0, 1]. */
function fbm(lat, u, v, px, py, octaves, salt = 0, gain = 0.5) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let fx = px;
  let fy = py;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(lat, u * fx, v * fy, fx, fy, salt + o);
    norm += amp;
    amp *= gain;
    fx *= 2;
    fy *= 2;
  }
  return sum / norm;
}

function image(size) {
  return { width: size, height: size, data: new Uint8Array(size * size * 4) };
}

function put(data, i, r, g, b, a = 255) {
  data[i] = clamp(Math.round(r), 0, 255);
  data[i + 1] = clamp(Math.round(g), 0, 255);
  data[i + 2] = clamp(Math.round(b), 0, 255);
  data[i + 3] = clamp(Math.round(a), 0, 255);
}

/** Shared loop: fn(u, v, x, y) returns [r, g, b, a]. */
function fill(size, fn) {
  const img = image(size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = fn(x / size, v, x, y);
      put(d, (y * size + x) * 4, r, g, b, a);
    }
  }
  return img;
}

/**
 * Engineered oak floor. The tile is 8 planks of 180 mm across u (1.44 m) and 2.88 m along v,
 * so repeat = (width / 1.44, length / 2.88). Two staggered end joints per plank column,
 * per-piece tone, grain streaks along v. Alpha holds roughness (0.38..0.78).
 */
export function oakPlanks(size = 1024, seed = SCENE_SEED + 11) {
  const rand = mulberry32(seed);
  const lat = makeLattice(rand);
  const PLANKS = 8;
  const joints = [];
  const tones = [];
  let j = rand();
  for (let i = 0; i < PLANKS; i++) {
    j = (j + 0.27 + 0.2 * rand()) % 1; // stagger neighbouring end joints
    joints.push(j);
    tones.push([0.88 + 0.22 * rand(), 0.88 + 0.22 * rand()]);
  }
  const base = [168, 131, 90];
  const gap = Math.max(1, size / 512);
  return fill(size, (u, v) => {
    const col = Math.min(PLANKS - 1, Math.floor(u * PLANKS));
    const fu = u * PLANKS - col;
    const pv = wrap(v - joints[col], 1);
    const piece = pv < 0.5 ? 0 : 1;
    const pp = pv % 0.5;
    const edgeU = Math.min(fu, 1 - fu) * (size / PLANKS);
    const edgeV = Math.min(pp, 0.5 - pp) * size;
    const off = col * 0.37 + piece * 0.53;
    const warp = valueNoise(lat, u * 4, v * 2, 4, 2, 7) - 0.5;
    const grain = fbm(lat, u + warp * 0.02, v + off, 64, 2, 3, 1);
    const fine = valueNoise(lat, u * 256, v * 16, 256, 16, 5);
    const figure = fbm(lat, u, v + off, 8, 1, 2, 9);
    let k = tones[col][piece] * (0.82 + 0.26 * grain + 0.06 * fine) * (0.94 + 0.12 * figure);
    let rough = clamp(0.5 + 0.35 * (grain - 0.5) + 0.06 * (fine - 0.5), 0.38, 0.72);
    const edge = Math.min(edgeU, edgeV);
    if (edge < gap) {
      k *= 0.55;
      rough = 0.78;
    } else if (edge < gap * 2.5) {
      k *= 0.86;
    }
    return [base[0] * k, base[1] * k, base[2] * k, rough * 255];
  });
}

/** Walnut veneer: continuous grain along v with a soft cathedral figure. Alpha = roughness. */
export function walnut(size = 512, seed = SCENE_SEED + 12) {
  const lat = makeLattice(mulberry32(seed));
  const base = [96, 66, 48];
  return fill(size, (u, v) => {
    const low = fbm(lat, u, v, 2, 2, 2, 3);
    const grain = fbm(lat, u + 0.03 * (low - 0.5), v, 48, 2, 3, 6);
    const figure = Math.sin(TAU * 3 * u + 5 * low);
    const k = 0.8 + 0.32 * grain + 0.07 * figure;
    const rough = clamp(0.5 + 0.18 * (grain - 0.5), 0.42, 0.6);
    return [base[0] * k, base[1] * k, base[2] * k, rough * 255];
  });
}

/** Warm white marble with grey-olive veins from domain-warped fbm. Alpha = roughness. */
export function marble(size = 1024, seed = SCENE_SEED + 13) {
  const lat = makeLattice(mulberry32(seed));
  const base = [238, 233, 224];
  const vein = [142, 140, 122];
  return fill(size, (u, v) => {
    const w1 = fbm(lat, u, v, 3, 3, 4, 10);
    const w2 = fbm(lat, u, v, 4, 4, 4, 20);
    const cloud = fbm(lat, u, v, 4, 4, 4, 30);
    const v1 = Math.pow(1 - Math.abs(Math.sin(TAU * (u + v) + 7 * (w1 - 0.5))), 18);
    const v2 = Math.pow(1 - Math.abs(Math.sin(TAU * (2 * u - 3 * v) + 9 * (w2 - 0.5))), 30);
    const t = clamp(v1 * 0.75 + v2 * 0.45, 0, 1);
    const k = 0.96 + 0.06 * cloud;
    return [
      base[0] * k + (vein[0] - base[0] * k) * t,
      base[1] * k + (vein[1] - base[1] * k) * t,
      base[2] * k + (vein[2] - base[2] * k) * t,
      (0.14 + 0.08 * t) * 255,
    ];
  });
}

/** Banded beige travertine with small dark pores. Alpha = roughness. */
export function travertine(size = 512, seed = SCENE_SEED + 14) {
  const lat = makeLattice(mulberry32(seed));
  const base = [216, 205, 184];
  return fill(size, (u, v) => {
    const w = valueNoise(lat, u * 3, v * 3, 3, 3, 2);
    const bands = fbm(lat, u + 0.05 * w, v, 2, 20, 3, 4);
    const pore = valueNoise(lat, u * 96, v * 192, 96, 192, 40) > 0.86;
    let k = 0.92 + 0.14 * bands;
    let rough = 0.62 + 0.1 * bands;
    if (pore) {
      k *= 0.72;
      rough = 0.85;
    }
    return [base[0] * k, base[1] * k, base[2] * k, rough * 255];
  });
}

/** Plain-weave linen as luminance (0.78..1): roughness and bump source. */
export function linen(size = 512, seed = SCENE_SEED + 15) {
  const lat = makeLattice(mulberry32(seed));
  const T = 96;
  return fill(size, (u, v) => {
    const wx = 0.5 + 0.5 * Math.cos(TAU * T * u);
    const wy = 0.5 + 0.5 * Math.cos(TAU * T * v);
    const weave = (Math.floor(u * T) + Math.floor(v * T)) & 1 ? wx : wy;
    const slub = valueNoise(lat, u * 4, v * T, 4, T, 50);
    const l = (0.78 + 0.14 * weave + 0.08 * slub) * 255;
    return [l, l, l, 255];
  });
}

/** Boucle: clustered loops as luminance, for bump and roughness. */
export function boucle(size = 512, seed = SCENE_SEED + 16) {
  const lat = makeLattice(mulberry32(seed));
  return fill(size, (u, v) => {
    const n = fbm(lat, u, v, 48, 48, 3, 60);
    const loops = valueNoise(lat, u * 160, v * 160, 160, 160, 70);
    const l = (0.55 + 0.3 * n + 0.15 * loops * loops) * 255;
    return [l, l, l, 255];
  });
}

/** Board-free cast concrete: mottling, speckle and pores. Alpha = roughness. */
export function concrete(size = 512, seed = SCENE_SEED + 17) {
  const lat = makeLattice(mulberry32(seed));
  const base = [189, 183, 170];
  return fill(size, (u, v) => {
    const m = fbm(lat, u, v, 4, 4, 5, 80);
    const s = valueNoise(lat, u * 200, v * 200, 200, 200, 90);
    const pore = valueNoise(lat, u * 128, v * 128, 128, 128, 95) > 0.9;
    let k = 0.93 + 0.1 * m + 0.04 * (s - 0.5);
    if (pore) k *= 0.8;
    const rough = clamp(0.82 + 0.1 * m, 0, 1);
    return [base[0] * k, base[1] * k, base[2] * k, rough * 255];
  });
}

/** Horizontal brushing streaks as luminance (0.72..1): multiplies a metal's roughness. */
export function brushedMetal(size = 512, seed = SCENE_SEED + 18) {
  const lat = makeLattice(mulberry32(seed));
  return fill(size, (u, v) => {
    const s = fbm(lat, u, v, 2, 160, 2, 100);
    const l = (0.72 + 0.28 * s) * 255;
    return [l, l, l, 255];
  });
}

/** Wool rug: tight loop texture on a paper field with an olive border band. Not tiling. */
export function woolRug(size = 512, seed = SCENE_SEED + 19) {
  const lat = makeLattice(mulberry32(seed));
  const field = [228, 221, 206];
  const olive = [91, 102, 52];
  return fill(size, (u, v) => {
    const d = Math.min(u, 1 - u, v, 1 - v);
    const loops = valueNoise(lat, u * 180, v * 180, 180, 180, 110);
    const mott = fbm(lat, u, v, 6, 6, 3, 120);
    let c = field;
    let k = 0.9 + 0.1 * loops + 0.06 * (mott - 0.5);
    if (d < 0.03) k *= 0.9;
    else if (d < 0.07) c = olive;
    return [c[0] * k, c[1] * k, c[2] * k, 255];
  });
}

/** Tiling ripple normal map (tangent space, +z up). */
export function waterNormal(size = 512, seed = SCENE_SEED + 20) {
  const lat = makeLattice(mulberry32(seed));
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      h[y * size + x] =
        fbm(lat, u, v, 6, 6, 4, 130) +
        0.18 * Math.sin(TAU * (4 * u + 7 * v)) +
        0.1 * Math.sin(TAU * (9 * u - 5 * v));
    }
  }
  const img = image(size);
  const strength = size / 24;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h[y * size + wrap(x + 1, size)] - h[y * size + wrap(x - 1, size)]) * strength;
      const dy = (h[wrap(y + 1, size) * size + x] - h[wrap(y - 1, size) * size + x]) * strength;
      const len = Math.hypot(dx, dy, 1);
      put(img.data, (y * size + x) * 4, (-dx / len * 0.5 + 0.5) * 255, (-dy / len * 0.5 + 0.5) * 255, (1 / len * 0.5 + 0.5) * 255);
    }
  }
  return img;
}

/**
 * Soft contact shadow: a rounded-rectangle falloff, opaque in the middle and 0 at the border.
 * The value is in every channel (alphaMap reads green).
 */
export function contactShadow(size = 128) {
  return fill(size, (u, v, x, y) => {
    const px = (2 * (x + 0.5)) / size - 1;
    const py = (2 * (y + 0.5)) / size - 1;
    const r = Math.pow(px ** 4 + py ** 4, 0.25);
    const a = Math.pow(1 - smoothstep(0.25, 1, r), 2) * 255;
    return [a, a, a, a];
  });
}
