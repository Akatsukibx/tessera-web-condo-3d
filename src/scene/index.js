import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { createLighting } from './lighting.js';
import { clearGeometryCache } from './geometry-kit.js';
import { createCameraRig } from './camera-rig.js';
import { createExplorerRig } from './explorer-rig.js';
import { createExterior, TOWER } from './sets/exterior.js';
import { createGround } from './sets/ground.js';
import { createLobby } from './sets/lobby.js';
import { createResidence, RESIDENCE_ORIGIN } from './sets/residence.js';
import { createSkyline } from './sets/skyline.js';
import { bandFor, levelAtHeight, levelInfo } from '../content/tower.js';

const CHAPTERS = 4;
const EXPLORER_TIME = 0.15; // dusk tint used for the explorer model
const IDLE_SWAY = { amplitude: 12, period: 24000 }; // degrees, ms

/**
 * One renderer, one canvas, two hosts: the story stage ('story') and the Tower Explorer
 * ('explorer'). setMode moves the canvas between hosts, which keeps the WebGL context.
 * @param {HTMLCanvasElement} canvas
 * @param {{reducedMotion: MediaQueryList, overlay?: HTMLElement|null, onFirstFrame?: () => void,
 *   onExplorerFrame?: (f:{x:number,top:number,bottom:number}) => void}} opts
 */
export function createScene(canvas, { reducedMotion, overlay = null, onFirstFrame, onExplorerFrame } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const mats = createMaterials();
  const lighting = createLighting(scene, renderer);
  // Outdoor reflective materials always reflect the dusk sky, whichever set is active.
  for (const key of ['glass', 'lowIron', 'river']) {
    mats[key].envMap = lighting.envDusk;
    mats[key].needsUpdate = true;
  }
  const rig = createCameraRig(RESIDENCE_ORIGIN);
  const xrig = createExplorerRig();
  const camera = rig.camera;

  const ground = createGround(mats);
  const exterior = createExterior(mats);
  const lobby = createLobby(mats);
  const residence = createResidence(mats);
  const skyline = createSkyline(lighting.envDusk);
  const towerGlow = exterior.userData.glowMaterials || [];
  const skylineGlow = skyline.userData.glowMaterials || [];
  scene.add(ground, exterior, lobby, residence, skyline);

  // --- Explorer extras: a site plinth and two highlight sleeves (hover, selected) -------------
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(56, 56, 0.8, 96),
    new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1 }),
  );
  plinth.position.y = -0.4;
  plinth.receiveShadow = true;
  plinth.visible = false;
  const sleeve = new THREE.BoxGeometry(1, 1, 1);
  const sleeveMat = (opacity) =>
    new THREE.MeshBasicMaterial({ color: '#A9B77A', transparent: true, opacity, depthWrite: false, toneMapped: false });
  const hoverMesh = new THREE.Mesh(sleeve, sleeveMat(0.28));
  const selectedMesh = new THREE.Mesh(sleeve, sleeveMat(0.5));
  for (const m of [hoverMesh, selectedMesh]) {
    m.visible = false;
    m.renderOrder = 2;
  }
  scene.add(plinth, hoverMesh, selectedMesh);

  // Pick volumes (not rendered): the body including fins, and the set-back crown.
  const bodyBox = new THREE.Box3(new THREE.Vector3(-15.6, 0, -13.6), new THREE.Vector3(15.6, TOWER.bodyTop, 13.6));
  const crownBox = new THREE.Box3(
    new THREE.Vector3(-12.6, TOWER.bodyTop, -10.6),
    new THREE.Vector3(12.6, TOWER.crownTop, 10.6),
  );

  const exteriorFocus = new THREE.Vector3(0, 40, 10);
  const explorerFocus = new THREE.Vector3(0, 74, 0);
  const residenceFocus = RESIDENCE_ORIGIN.clone().add(new THREE.Vector3(-1, 1.5, 0));
  let activeSet = '';
  const showSet = (set) => {
    if (set === activeSet) return;
    activeSet = set;
    const ext = set === 'exterior';
    exterior.visible = ext;
    lobby.visible = ext;
    residence.visible = !ext;
    lighting.setEnvironment(set);
    renderer.toneMappingExposure = ext ? 0.95 : 1.0;
    if (ext) lighting.setFocus(exteriorFocus, 95);
    else lighting.setFocus(residenceFocus, 12);
  };

  /** @type {'story'|'explorer'} */
  let mode = 'story';
  let target = 0;
  let current = 0;
  let dirty = true;
  const size = { w: 1, h: 1 };

  // Explorer state
  let yaw = 0;
  let yawTarget = 0;
  let idle = false;
  let idleStart = 0;
  let panelOffset = 0;
  let hover = null;
  let selected = null;

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    size.w = w;
    size.h = h;
    camera.aspect = w / h;
    dirty = true;
  };

  const applyPose = (p) => {
    const pose = rig.poseAt(p);
    showSet(pose.set);
    camera.position.copy(pose.pos);
    camera.lookAt(pose.target);
    camera.fov = pose.fov;
    camera.near = 0.1;
    camera.filmOffset = 0;
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    if (overlay) overlay.style.opacity = reducedMotion.matches ? '0' : pose.overlay.toFixed(3);

    const k = Math.min(1, Math.max(0, p / (CHAPTERS - 1)));
    lighting.setTime(k);
    for (const mat of skylineGlow) mat.emissiveIntensity = 0.3 + 0.9 * k;
    // Tower glow: base intensity (0.5 by default) rising by 120 % toward late dusk.
    for (const mat of towerGlow) mat.emissiveIntensity = (mat.userData.glowBase ?? 0.5) * (1 + 1.2 * k);
    lighting.follow(camera);
  };

  const applyExplorer = () => {
    const pose = xrig.poseFor(yaw);
    camera.position.copy(pose.pos);
    camera.lookAt(pose.target);
    camera.fov = pose.fov;
    camera.near = 5;
    camera.filmOffset = 0;
    // Keep the tower centred in the space left of the open panel.
    if (panelOffset > 0) camera.setViewOffset(size.w, size.h, panelOffset / 2, 0, size.w, size.h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    lighting.follow(camera);
  };

  const v = new THREE.Vector3();
  const toCanvas = (x, y, z) => {
    v.set(x, y, z).project(camera);
    return { x: ((v.x + 1) / 2) * size.w, y: ((1 - v.y) / 2) * size.h };
  };

  const placeSleeve = (mesh, level) => {
    const b = level == null ? null : bandFor(level);
    if (!b) {
      mesh.visible = false;
      return;
    }
    mesh.scale.set(b.w + 1.6, b.y1 - b.y0 - 0.15, b.d + 1.6);
    mesh.position.set(0, (b.y0 + b.y1) / 2, 0);
    mesh.visible = mode === 'explorer';
  };
  const updateSleeves = () => {
    placeSleeve(selectedMesh, selected);
    const same = hover != null && selected != null && bandFor(hover).y0 === bandFor(selected).y0;
    placeSleeve(hoverMesh, same ? null : hover);
  };

  const enterExplorerLook = () => {
    activeSet = '';
    exterior.visible = true;
    lobby.visible = true;
    residence.visible = false;
    ground.visible = false;
    skyline.visible = false;
    plinth.visible = true;
    lighting.setEnvironment('exterior');
    lighting.setTime(EXPLORER_TIME);
    lighting.setExplorer(true);
    lighting.setFocus(explorerFocus, 110);
    renderer.toneMappingExposure = 1.0;
    for (const mat of towerGlow) mat.emissiveIntensity = (mat.userData.glowBase ?? 0.5) * (1 + 1.2 * EXPLORER_TIME);
    if (overlay) overlay.style.opacity = '0';
  };

  const leaveExplorerLook = () => {
    lighting.setExplorer(false);
    ground.visible = true;
    skyline.visible = true;
    plinth.visible = false;
    activeSet = ''; // showSet re-applies visibility, environment and shadow focus
  };

  let loggedKey = '';
  const render = () => {
    if (mode === 'explorer') {
      applyExplorer();
      renderer.render(scene, camera);
      if (onExplorerFrame) {
        const c = toCanvas(0, 74, 0);
        onExplorerFrame({ x: c.x, top: toCanvas(0, TOWER.crownTop, 0).y, bottom: toCanvas(0, 0, 0).y });
      }
    } else {
      applyPose(current);
      renderer.render(scene, camera);
    }
    dirty = false;
    if (import.meta.env.DEV) {
      const key = mode === 'explorer' ? 'explorer' : `chapter ${Math.round(current) + 1}`;
      if (key !== loggedKey) {
        loggedKey = key;
        const { calls, triangles } = renderer.info.render;
        console.info(`[tessera] ${key}: ${calls} draw calls, ${triangles} triangles`);
      }
    }
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  resize();

  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) dirty = true;
  });
  io.observe(canvas);

  let last = performance.now();
  let raf = 0;
  let firstFrameDone = false;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!firstFrameDone) {
      firstFrameDone = true;
      current = reducedMotion.matches ? Math.round(target) : target;
      render();
      onFirstFrame?.();
      return;
    }
    if (!visible || document.visibilityState !== 'visible') return;
    if (mode === 'explorer') {
      // The story stage is off screen: keep its pose current so returning shows the right frame.
      current = reducedMotion.matches ? Math.round(target) : target;
      const still = reducedMotion.matches;
      if (idle && !still) {
        yawTarget = IDLE_SWAY.amplitude * Math.sin((2 * Math.PI * (now - idleStart)) / IDLE_SWAY.period);
      }
      if (still) {
        if (yaw !== yawTarget) {
          yaw = yawTarget;
          dirty = true;
        }
      } else if (Math.abs(yawTarget - yaw) > 0.01) {
        yaw += (yawTarget - yaw) * (1 - Math.exp(-dt * 6));
        dirty = true;
      } else if (yaw !== yawTarget) {
        yaw = yawTarget;
        dirty = true;
      }
      if (dirty) render();
      return;
    }
    if (reducedMotion.matches) {
      // No tweening: snap to the nearest chapter keyframe.
      const snapped = Math.round(target);
      if (snapped !== current) {
        current = snapped;
        dirty = true;
      }
    } else if (Math.abs(target - current) > 0.0005) {
      current += (target - current) * (1 - Math.exp(-dt * 5));
      dirty = true;
    } else if (current !== target) {
      current = target;
      dirty = true;
    }
    if (dirty) render();
  };
  raf = requestAnimationFrame(loop);

  return {
    get mode() {
      return mode;
    },
    setProgress(p) {
      target = Math.min(CHAPTERS - 1, Math.max(0, p));
    },
    /** Jump without damping and render immediately. */
    jumpTo(p) {
      target = Math.min(CHAPTERS - 1, Math.max(0, p));
      current = reducedMotion.matches ? Math.round(target) : target;
      if (mode === 'story') render();
    },
    goToChapter(i) {
      this.jumpTo(i);
    },
    /**
     * Move the canvas to another host and switch the camera state. The vacated host keeps a
     * still frame in `posterOut` (a 2D canvas) so it never shows a blank stage.
     * @param {'story'|'explorer'} next
     * @param {HTMLElement} host
     * @param {HTMLCanvasElement|null} [posterOut]
     */
    setMode(next, host, posterOut = null) {
      if (next === mode) return;
      if (posterOut) this.snapshot(posterOut);
      mode = next;
      const poster = host.querySelector('.scene-poster');
      host.insertBefore(canvas, poster ? poster.nextSibling : host.firstChild);
      ro.disconnect();
      ro.observe(host);
      if (next === 'explorer') enterExplorerLook();
      else leaveExplorerLook();
      updateSleeves();
      resize();
      render();
    },
    /** @param {number} deg  @param {boolean} [instant] */
    setExplorerYaw(deg, instant = false) {
      yawTarget = xrig.clampYaw(deg);
      if (instant || reducedMotion.matches) {
        yaw = yawTarget;
        if (mode === 'explorer') render();
      }
    },
    getExplorerYaw() {
      return yaw;
    },
    getExplorerYawTarget() {
      return yawTarget;
    },
    /** Gentle idle sway; ignored under reduced motion. */
    setIdle(on) {
      const next = Boolean(on) && !reducedMotion.matches;
      if (next && !idle) idleStart = performance.now() - (IDLE_SWAY.period * Math.asin(Math.max(-1, Math.min(1, yaw / IDLE_SWAY.amplitude)))) / (2 * Math.PI);
      idle = next;
      if (!idle) yawTarget = yaw;
    },
    /** Level under a client point, or null. Explorer mode only. */
    pickLevel(clientX, clientY) {
      if (mode !== 'explorer') return null;
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      camera.updateMatrixWorld();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      let best = null;
      let bestD = Infinity;
      for (const [box, lo, hi] of [
        [bodyBox, 0, TOWER.bodyTop - 0.01],
        [crownBox, TOWER.bodyTop + 0.01, TOWER.crownTop - 0.01],
      ]) {
        if (ray.ray.intersectBox(box, hit)) {
          const d = hit.distanceTo(ray.ray.origin);
          if (d < bestD) {
            bestD = d;
            best = levelAtHeight(Math.min(hi, Math.max(lo, hit.y)));
          }
        }
      }
      return best;
    },
    /** @param {{hover?: number|null, selected?: number|null}} h */
    setHighlight(h) {
      if ('hover' in h) hover = h.hover ?? null;
      if ('selected' in h) selected = h.selected ?? null;
      updateSleeves();
      dirty = true;
    },
    /** Width in CSS px of the open side panel (0 when closed). */
    setPanelOffset(px) {
      panelOffset = Math.max(0, px || 0);
      dirty = true;
      if (mode === 'explorer') render();
    },
    /** Client coordinates of a level's band centre on the south face (for tests). */
    screenPointForLevel(level) {
      const L = levelInfo(level);
      if (!L || mode !== 'explorer') return null;
      applyExplorer();
      camera.updateMatrixWorld();
      const z = level >= 41 ? crownBox.max.z : bodyBox.max.z;
      const p = toCanvas(0, (L.y0 + L.y1) / 2, z);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + p.x, y: r.top + p.y };
    },
    /** Render once and copy the frame into a 2D canvas. */
    snapshot(out) {
      render();
      out.width = canvas.width;
      out.height = canvas.height;
      const ctx = out.getContext('2d');
      if (ctx) ctx.drawImage(canvas, 0, 0);
    },
    /** Draw calls and triangles of the last rendered frame. */
    info() {
      const { calls, triangles } = renderer.info.render;
      return { calls, triangles };
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      // Collect every GPU resource once, then free it. PMREM textures belong to lighting.
      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      scene.traverse((o) => {
        if (o.isInstancedMesh) o.dispose();
        if (o.geometry) geometries.add(o.geometry);
        const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        list.forEach((m) => materials.add(m));
      });
      const addTexture = (t) => {
        if (t && t.isTexture && !t.isRenderTargetTexture) textures.add(t);
      };
      materials.forEach((m) => {
        Object.values(m).forEach(addTexture);
        if (m.uniforms) Object.values(m.uniforms).forEach((u) => addTexture(u.value));
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      mats.dispose(); // palette entries not in the scene, and the texture cache
      clearGeometryCache();
      lighting.dispose();
      renderer.dispose();
    },
  };
}
