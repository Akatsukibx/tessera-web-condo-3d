import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Direction toward the sun: low in the west, a little south.
export const SUN_DIR = new THREE.Vector3(-1, 0.32, 0.25).normalize();
// The visible sun disc sits lower than the light so it reads as dusk on the horizon.
const DISC_DIR = new THREE.Vector3(-1, 0.06, 0.18).normalize();

const SKY_EARLY = { top: '#4C5661', horizon: '#D6A170', fog: '#A88C73', sun: 2.6 };
const SKY_LATE = { top: '#2B3138', horizon: '#C98B5A', fog: '#6E5C4E', sun: 1.5 };
const GROUND = '#3A332C';
const SUN_DISC = '#F5D29A';

const HEMI_BASE = 0.35;
const ENV_INTENSITY = { exterior: 0.6, residence: 0.35 };

const skyVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const skyFragment = /* glsl */ `
uniform vec3 topColor;
uniform vec3 horizonColor;
uniform vec3 groundColor;
varying vec3 vWorld;
void main() {
  vec3 d = normalize(vWorld - cameraPosition);
  float h = d.y;
  vec3 c = mix(horizonColor, topColor, smoothstep(0.0, 0.5, h));
  c = mix(c, groundColor, smoothstep(0.0, -0.15, h));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

function skyMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
}

/** PMREM of a private scene: the dusk sky sphere plus a bright sun disc. */
function buildDuskEnvironment(pmrem) {
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    skyMaterial({
      topColor: { value: new THREE.Color(SKY_EARLY.top) },
      horizonColor: { value: new THREE.Color(SKY_EARLY.horizon) },
      groundColor: { value: new THREE.Color(GROUND) },
    }),
  );
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(3, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(SUN_DISC).multiplyScalar(6), toneMapped: false }),
  );
  disc.position.copy(DISC_DIR).multiplyScalar(40);
  disc.lookAt(0, 0, 0);
  env.add(sky, disc);
  // 128 px cube faces: the dusk sky is smooth, and smaller targets keep SwiftShader start-up fast.
  const target = pmrem.fromScene(env, 0.02, 0.1, 100, { size: 128 });
  [sky, disc].forEach((m) => {
    m.geometry.dispose();
    m.material.dispose();
  });
  return target;
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} [renderer] needed for the PMREM environments
 */
export function createLighting(scene, renderer) {
  const hemi = new THREE.HemisphereLight('#C9CFD3', '#3A3428', HEMI_BASE);
  const sun = new THREE.DirectionalLight('#E9A86B', SKY_EARLY.sun);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 3;
  sun.shadow.blurSamples = 12;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);

  const uniforms = {
    topColor: { value: new THREE.Color(SKY_EARLY.top) },
    horizonColor: { value: new THREE.Color(SKY_EARLY.horizon) },
    groundColor: { value: new THREE.Color(GROUND) },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMaterial(uniforms));
  sky.renderOrder = -1;
  scene.add(sky);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(38, 32),
    new THREE.MeshBasicMaterial({ color: SUN_DISC, fog: false, toneMapped: false }),
  );
  scene.add(disc);

  scene.fog = new THREE.Fog(SKY_EARLY.fog, 260, 2400);

  // Image-based light: dusk sky outside, a neutral room inside. Built once at startup.
  let pmrem = null;
  let duskTarget = null;
  let interiorTarget = null;
  if (renderer) {
    pmrem = new THREE.PMREMGenerator(renderer);
    duskTarget = buildDuskEnvironment(pmrem);
    const room = new RoomEnvironment();
    interiorTarget = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 128 });
    room.dispose();
  }
  const envDusk = duskTarget ? duskTarget.texture : null;
  const envInterior = interiorTarget ? interiorTarget.texture : null;

  const early = {
    top: new THREE.Color(SKY_EARLY.top),
    horizon: new THREE.Color(SKY_EARLY.horizon),
    fog: new THREE.Color(SKY_EARLY.fog),
  };
  const late = {
    top: new THREE.Color(SKY_LATE.top),
    horizon: new THREE.Color(SKY_LATE.horizon),
    fog: new THREE.Color(SKY_LATE.fog),
  };

  /** Aim the shadow camera at a set: tight frustum around its centre. */
  function setFocus(center, radius) {
    sun.target.position.copy(center);
    sun.position.copy(center).addScaledVector(SUN_DIR, 400);
    const c = sun.shadow.camera;
    c.left = -radius;
    c.right = radius;
    c.top = radius;
    c.bottom = -radius;
    c.near = 1;
    c.far = 900;
    c.updateProjectionMatrix();
    sun.target.updateMatrixWorld();
  }

  /** k: 0 = early dusk (arrival), 1 = late dusk (balcony). */
  function setTime(k) {
    uniforms.topColor.value.copy(early.top).lerp(late.top, k);
    uniforms.horizonColor.value.copy(early.horizon).lerp(late.horizon, k);
    scene.fog.color.copy(early.fog).lerp(late.fog, k);
    sun.intensity = SKY_EARLY.sun + (SKY_LATE.sun - SKY_EARLY.sun) * k;
    hemi.intensity = HEMI_BASE - 0.1 * k;
  }

  /** Keep sky and sun disc centred on the camera. */
  function follow(camera) {
    sky.position.copy(camera.position);
    disc.position.copy(camera.position).addScaledVector(DISC_DIR, 2800);
    disc.lookAt(camera.position);
  }

  /** Switch image-based light: 'exterior' uses the dusk sky, 'residence' the interior room. */
  function setEnvironment(set) {
    const ext = set === 'exterior';
    scene.environment = ext ? envDusk : envInterior;
    scene.environmentIntensity = ext ? ENV_INTENSITY.exterior : ENV_INTENSITY.residence;
  }

  /**
   * Tower Explorer look: the tower as a scale model on paper. Hides the sky dome and sun disc,
   * sets a paper background with matching far fog, and restores the dusk setup when turned off.
   * Call after setEnvironment/setTime, which it overrides.
   */
  const paper2 = new THREE.Color('#EAE6DC');
  function setExplorer(on) {
    sky.visible = !on;
    disc.visible = !on;
    scene.background = on ? paper2 : null;
    if (on) {
      scene.fog.color.copy(paper2);
      scene.fog.near = 700;
      scene.fog.far = 1600;
      scene.environmentIntensity = 0.9;
    } else {
      scene.fog.near = 260;
      scene.fog.far = 2400;
    }
  }

  /** Free the PMREM targets and generator. Sky and disc are disposed with the scene. */
  function dispose() {
    if (duskTarget) duskTarget.dispose();
    if (interiorTarget) interiorTarget.dispose();
    if (pmrem) pmrem.dispose();
    scene.environment = null;
  }

  return { hemi, sun, sky, envDusk, envInterior, setFocus, setTime, follow, setEnvironment, setExplorer, dispose };
}
