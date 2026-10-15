import * as THREE from 'three';

// Tower Explorer camera: a fixed-distance orbit around the tower with limited yaw, no zoom and
// no pitch control. Yaw 0 looks at the south-east corner, the face the walkthrough opens on.
export const EXPLORER_VIEW = {
  target: new THREE.Vector3(0, 74, 0),
  distance: 400,
  elevationDeg: 6,
  fov: 28,
  yawLimit: 35,
  // Azimuth of the chapter 1 street camera (62, 110), measured from +x toward +z.
  baseAzimuth: Math.atan2(110, 62),
};

export const clampYaw = (deg) => Math.max(-EXPLORER_VIEW.yawLimit, Math.min(EXPLORER_VIEW.yawLimit, deg));

export function createExplorerRig() {
  const camera = new THREE.PerspectiveCamera(EXPLORER_VIEW.fov, 16 / 9, 5, 6000);
  const pos = new THREE.Vector3();
  const target = EXPLORER_VIEW.target.clone();

  /** @param {number} yawDeg */
  function poseFor(yawDeg) {
    const a = EXPLORER_VIEW.baseAzimuth + THREE.MathUtils.degToRad(clampYaw(yawDeg));
    const el = THREE.MathUtils.degToRad(EXPLORER_VIEW.elevationDeg);
    const d = EXPLORER_VIEW.distance;
    pos.set(Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(a) * Math.cos(el) * d).add(target);
    return { pos, target, fov: EXPLORER_VIEW.fov };
  }

  return { camera, poseFor, clampYaw };
}
