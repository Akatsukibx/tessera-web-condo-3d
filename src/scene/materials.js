import * as THREE from 'three';
import { colorTexture, roughnessTexture, dataTexture, disposeTextures } from './textures.js';

/**
 * Shared PBR material palette for every set. No DOM use, so it builds in node.
 * Textured materials use a white-ish `color` as a tint over the generated albedo; roughness
 * maps hold absolute roughness, so their `roughness` is 1 unless noted.
 * Outdoor reflective materials (glass, lowIron, river) get `envMap` from the scene (envDusk).
 */
export function createMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);

  const concreteMap = colorTexture('concrete');
  const concreteRough = roughnessTexture('concrete');
  const oakMap = colorTexture('oak');
  const oakRough = roughnessTexture('oak');
  const travMap = colorTexture('travertine');
  const travRough = roughnessTexture('travertine');
  const brushed = dataTexture('brushedMetal');
  const linenTex = dataTexture('linen');
  const boucleTex = dataTexture('boucle');

  const glassBase = {
    transparent: true,
    depthWrite: false,
    ior: 1.5,
    specularIntensity: 1,
  };

  const materials = {
    // Existing keys (used by the current sets)
    concrete: std({ color: '#FFFFFF', map: concreteMap, roughnessMap: concreteRough, roughness: 1 }),
    concreteDark: std({ color: '#C1BFBB', map: concreteMap, roughnessMap: concreteRough, roughness: 1 }),
    glass: phys({ ...glassBase, color: '#6B5A45', metalness: 0.2, roughness: 0.05, opacity: 0.45 }),
    lowIron: phys({ ...glassBase, color: '#DCE3E0', metalness: 0, roughness: 0.03, opacity: 0.12 }),
    travertine: std({ color: '#FFFFFF', map: travMap, roughnessMap: travRough, roughness: 1 }),
    oak: std({ color: '#F2EEE8', map: oakMap, roughnessMap: oakRough, roughness: 1 }),
    oakDark: std({ color: '#7B7975', map: oakMap, roughnessMap: oakRough, roughness: 1 }),
    inkMetal: std({ color: '#2A2A26', metalness: 0.6, roughness: 0.45, roughnessMap: brushed }),
    oliveFabric: std({ color: '#5B6634', roughness: 1, roughnessMap: linenTex, bumpMap: linenTex, bumpScale: 0.4 }),
    plaster: std({ color: '#E6E0D4', roughness: 0.92 }),
    stone: std({ color: '#EEEAE3', map: travMap, roughnessMap: travRough, roughness: 1 }),
    planting: std({ color: '#55603A', roughness: 1, flatShading: true }),
    paving: std({ color: '#BFBDB8', map: concreteMap, roughnessMap: concreteRough, roughness: 1 }),
    court: std({ color: '#DEDCD8', map: concreteMap, roughnessMap: concreteRough, roughness: 1 }),
    road: std({ color: '#34342F', roughnessMap: concreteRough, roughness: 1 }),
    river: std({ color: '#4F5D5B', roughness: 0.12, metalness: 0, envMapIntensity: 1.2 }),
    warmLight: new THREE.MeshBasicMaterial({ color: '#F6D6A8' }),

    // Added for the furniture and refined sets
    walnut: std({ color: '#FFFFFF', map: colorTexture('walnut'), roughnessMap: roughnessTexture('walnut'), roughness: 1 }),
    marble: std({ color: '#FFFFFF', map: colorTexture('marble'), roughnessMap: roughnessTexture('marble'), roughness: 1 }),
    brass: std({ color: '#B08D57', metalness: 1, roughness: 0.32, roughnessMap: brushed }),
    bronze: std({ color: '#6B4E33', metalness: 1, roughness: 0.4, roughnessMap: brushed }),
    linenOlive: std({ color: '#5B6634', roughness: 1, roughnessMap: linenTex, bumpMap: linenTex, bumpScale: 0.4 }),
    linenPaper: std({ color: '#E8E1D3', roughness: 1, roughnessMap: linenTex, bumpMap: linenTex, bumpScale: 0.4 }),
    boucle: std({ color: '#E9E3D6', roughness: 1, roughnessMap: boucleTex, bumpMap: boucleTex, bumpScale: 1 }),
    leather: std({ color: '#7A4A2A', roughness: 0.55 }),
    wool: std({ color: '#FFFFFF', map: colorTexture('woolRug'), roughness: 1 }),
    ceramic: phys({ color: '#EDE6D8', roughness: 0.25, clearcoat: 0.3, clearcoatRoughness: 0.2 }),
    smokedGlass: phys({ ...glassBase, color: '#4A4038', metalness: 0, roughness: 0.08, opacity: 0.55 }),
    leaf: std({ color: '#55603A', roughness: 0.7, side: THREE.DoubleSide }),
    soil: std({ color: '#3B3026', roughness: 1 }),
    ledStrip: new THREE.MeshBasicMaterial({ color: '#FFD9A8', toneMapped: false }),
    shadowDecal: new THREE.MeshBasicMaterial({
      color: '#000000',
      alphaMap: dataTexture('contactShadow'),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  };

  return {
    ...materials,
    /** Dispose every palette material and the shared textures. */
    dispose() {
      Object.values(materials).forEach((m) => m.dispose());
      disposeTextures();
    },
  };
}
