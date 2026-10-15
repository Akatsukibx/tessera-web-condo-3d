import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createExplorerRig, clampYaw, EXPLORER_VIEW } from '../../src/scene/explorer-rig.js';

describe('explorer camera rig', () => {
  it('clamps yaw to ±35°', () => {
    expect(clampYaw(90)).toBe(35);
    expect(clampYaw(-90)).toBe(-35);
    expect(clampYaw(10)).toBe(10);
  });

  it('orbits at a fixed distance from the target', () => {
    const rig = createExplorerRig();
    for (const yaw of [-35, 0, 35, 80]) {
      const { pos, target } = rig.poseFor(yaw);
      expect(pos.distanceTo(target)).toBeCloseTo(EXPLORER_VIEW.distance, 6);
    }
  });

  it('frames the whole tower, filling at least 70 % of the view height', () => {
    const rig = createExplorerRig();
    const cam = rig.camera;
    cam.aspect = 1.6;
    for (const yaw of [-35, 0, 35]) {
      const { pos, target, fov } = rig.poseFor(yaw);
      cam.position.copy(pos);
      cam.lookAt(target);
      cam.fov = fov;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      const base = new THREE.Vector3(0, 0, 0).project(cam);
      const top = new THREE.Vector3(0, 147.5, 0).project(cam);
      for (const p of [base, top]) {
        expect(p.y).toBeGreaterThan(-0.95);
        expect(p.y).toBeLessThan(0.95);
      }
      expect(top.y - base.y).toBeGreaterThanOrEqual(1.4);
    }
  });
});
