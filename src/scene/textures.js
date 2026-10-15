// Cached DataTextures built from the pure generators in texture-data.js. No DOM use.

import * as THREE from 'three';
import {
  oakPlanks,
  walnut,
  marble,
  travertine,
  linen,
  boucle,
  concrete,
  brushedMetal,
  woolRug,
  waterNormal,
  contactShadow,
} from './texture-data.js';

/** Generators by name. `clamp` marks single-use images (no tiling). */
const SOURCES = {
  oak: { make: () => oakPlanks(1024) },
  walnut: { make: () => walnut(512) },
  marble: { make: () => marble(1024) },
  travertine: { make: () => travertine(512) },
  linen: { make: () => linen(512) },
  boucle: { make: () => boucle(512) },
  concrete: { make: () => concrete(512) },
  brushedMetal: { make: () => brushedMetal(512) },
  woolRug: { make: () => woolRug(512), clamp: true },
  waterNormal: { make: () => waterNormal(512) },
  contactShadow: { make: () => contactShadow(128), clamp: true },
};

const images = new Map();
const textures = new Map();

function image(name) {
  if (!images.has(name)) {
    const src = SOURCES[name];
    if (!src) throw new Error(`Unknown texture: ${name}`);
    images.set(name, src.make());
  }
  return images.get(name);
}

function build(key, name, data, colorSpace) {
  const { width, height } = image(name);
  const t = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  const wrapMode = SOURCES[name].clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.wrapS = wrapMode;
  t.wrapT = wrapMode;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  t.colorSpace = colorSpace;
  t.name = key;
  t.needsUpdate = true;
  textures.set(key, t);
  return t;
}

/** Colour (albedo) map, sRGB, alpha forced opaque. */
export function colorTexture(name) {
  const key = `${name}:color`;
  if (textures.has(key)) return textures.get(key);
  const src = image(name).data;
  const data = new Uint8Array(src);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return build(key, name, data, THREE.SRGBColorSpace);
}

/** Roughness map from the generator's alpha channel, written to RGB (three reads green). */
export function roughnessTexture(name) {
  const key = `${name}:rough`;
  if (textures.has(key)) return textures.get(key);
  const src = image(name).data;
  const data = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3];
    data[i] = a;
    data[i + 1] = a;
    data[i + 2] = a;
    data[i + 3] = 255;
  }
  return build(key, name, data, THREE.NoColorSpace);
}

/** Raw data map (bump, roughness luminance, normal or alpha), linear. */
export function dataTexture(name) {
  const key = `${name}:data`;
  if (textures.has(key)) return textures.get(key);
  return build(key, name, image(name).data, THREE.NoColorSpace);
}

/**
 * A repeat variant of a cached texture. Clones share the image source, so the GPU upload is
 * shared and only the UV transform differs.
 */
export function repeated(texture, x, y = x) {
  const key = `${texture.name}@${x},${y}`;
  if (textures.has(key)) return textures.get(key);
  const t = texture.clone();
  t.name = key;
  t.repeat.set(x, y);
  textures.set(key, t);
  return t;
}

/** Dispose every cached texture and clear the caches. */
export function disposeTextures() {
  textures.forEach((t) => t.dispose());
  textures.clear();
  images.clear();
}
