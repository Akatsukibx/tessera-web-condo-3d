import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smoothstep = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/**
 * Camera keyframes per chapter and the paths between them.
 * Segment 0→1 (street → lobby) and 2→3 (living → balcony) are continuous curves.
 * Segment 1→2 is the lift: an ink overlay fades in, the sets swap at the midpoint, then it fades out.
 * @param {THREE.Vector3} res  world origin of the level-34 residence set
 */
export function createCameraRig(res) {
  const R = (x, y, z) => V(res.x + x, res.y + y, res.z + z);
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 6000);

  const keys = [
    { pos: V(62, 1.7, 110), target: V(0, 60, 0), fov: 54 },
    { pos: V(7.5, 1.7, 10.5), target: V(-3, 2.9, 1.5), fov: 60 },
    // From the south-east of the room looking WSW: sofa left, dining and glazing centre, island right.
    { pos: R(3.6, 1.6, 1.25), target: R(-3.6, 0.95, -1.9), fov: 62 },
    { pos: R(-5.2, 1.55, 0.6), target: R(-60, -11, -4), fov: 50 },
  ];

  const path01 = new THREE.CatmullRomCurve3([keys[0].pos, V(30, 2.2, 50), V(10, 1.9, 19), keys[1].pos]);
  const path23 = new THREE.CatmullRomCurve3([keys[2].pos, R(0.6, 1.6, 1.2), R(-3.75, 1.6, 0.6), keys[3].pos]);

  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();

  /**
   * @param {number} p progress 0..3
   * @returns {{pos:THREE.Vector3,target:THREE.Vector3,fov:number,set:'exterior'|'residence',overlay:number}}
   */
  function poseAt(p) {
    const c = Math.min(3, Math.max(0, p));
    let fov;
    let set = 'exterior';
    let overlay = 0;
    if (c < 1) {
      const s = smoothstep(c);
      pos.copy(path01.getPoint(s));
      target.copy(keys[0].target).lerp(keys[1].target, s);
      fov = keys[0].fov + (keys[1].fov - keys[0].fov) * s;
    } else if (c < 2) {
      const f = c - 1;
      overlay = clamp01((0.5 - Math.abs(f - 0.5)) / 0.3);
      const k = f < 0.5 ? keys[1] : keys[2];
      set = f < 0.5 ? 'exterior' : 'residence';
      pos.copy(k.pos);
      target.copy(k.target);
      fov = k.fov;
    } else {
      set = 'residence';
      const s = smoothstep(c - 2);
      pos.copy(path23.getPoint(s));
      target.copy(keys[2].target).lerp(keys[3].target, s);
      fov = keys[2].fov + (keys[3].fov - keys[2].fov) * s;
    }
    return { pos, target, fov, set, overlay };
  }

  return { camera, poseAt, keys };
}
