// three.js r163+ requires WebGL 2. `?nowebgl` forces the static fallback for testing.

export function forceNoWebGL() {
  return new URLSearchParams(window.location.search).has('nowebgl');
}

export function hasWebGL() {
  if (forceNoWebGL()) return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
