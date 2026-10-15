import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Batcher, cushion, roundedBox } from '../../src/scene/geometry-kit.js';

describe('Batcher', () => {
  it('merges N boxes of one material into one mesh with the summed vertex count', () => {
    const material = new THREE.MeshStandardMaterial();
    const b = new Batcher();
    const geos = [new THREE.BoxGeometry(1, 1, 1), new THREE.BoxGeometry(1, 0.5, 1), new THREE.BoxGeometry(2, 1, 1, 2, 1, 1)];
    geos.forEach((g, i) => b.add(g, material, new THREE.Matrix4().makeTranslation(i * 3, 0, 0)));
    const meshes = b.build();
    expect(meshes).toHaveLength(1);
    const sum = geos.reduce((n, g) => n + g.attributes.position.count, 0);
    expect(meshes[0].geometry.attributes.position.count).toBe(sum);
    expect(meshes[0].material).toBe(material);
    // The transform is baked: the last box sits around x = 6.
    expect(meshes[0].geometry.boundingBox.max.x).toBeCloseTo(7);
  });

  it('builds one mesh per material', () => {
    const a = new THREE.MeshStandardMaterial();
    const c = new THREE.MeshStandardMaterial();
    const b = new Batcher();
    b.add(new THREE.BoxGeometry(), a);
    b.add(new THREE.BoxGeometry(), c);
    b.add(new THREE.BoxGeometry(), a);
    const meshes = b.build();
    expect(meshes).toHaveLength(2);
    expect(new Set(meshes.map((m) => m.material))).toEqual(new Set([a, c]));
  });

  it('merges indexed and non-indexed geometry (box, rounded box, flat box)', () => {
    const material = new THREE.MeshStandardMaterial();
    const b = new Batcher();
    b.add(new THREE.BoxGeometry(), material);
    b.add(roundedBox(1, 0.5, 1, 0.05), material);
    b.add(new THREE.BoxGeometry().toNonIndexed(), material);
    const [mesh] = b.build();
    expect(mesh.geometry.index).toBeNull();
    expect(mesh.geometry.attributes.position.count).toBeGreaterThan(72);
    expect(Object.keys(mesh.geometry.attributes).sort()).toEqual(['normal', 'position', 'uv']);
  });
});

describe('cushion', () => {
  it('sinks the top centre by about `sag` below the top corners', () => {
    const w = 0.8;
    const h = 0.2;
    const d = 0.8;
    const sag = 0.03;
    const g = cushion(w, h, d, sag, { radius: 0.04 });
    const pos = g.attributes.position;
    let centreY = -Infinity;
    let topY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      topY = Math.max(topY, y);
      if (Math.abs(x) < 1e-6 && Math.abs(z) < 1e-6) centreY = Math.max(centreY, y);
    }
    expect(centreY).toBeCloseTo(h / 2 - sag, 5);
    expect(topY - centreY).toBeGreaterThan(sag * 0.9);
    expect(topY - centreY).toBeLessThanOrEqual(sag);
  });

  it('keeps a flat bottom on y = -h/2', () => {
    const g = cushion(1, 0.2, 0.6, 0.03);
    g.computeBoundingBox();
    expect(g.boundingBox.min.y).toBeCloseTo(-0.1, 5);
  });
});
