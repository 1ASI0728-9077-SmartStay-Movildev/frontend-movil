import type { RoomScene } from '../api/types';

// Visores three.js que corren dentro de una WebView. three se carga desde un CDN
// (la app necesita internet de todos modos). Los datos van embebidos en el HTML.

const THREE_VERSION = '0.170.0';

const head = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body{margin:0;height:100%;overflow:hidden;background:#eaf0f2;font-family:sans-serif}
#host{position:absolute;inset:0}
canvas{display:block;touch-action:none}
.bar{position:absolute;top:8px;left:8px;right:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;z-index:2}
.bar button,.bar label{background:#fff;border:1px solid #c9d3d6;border-radius:8px;padding:8px 12px;font-size:14px;color:#16202e}
.bar label input{margin-right:6px}
#msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#6b7685;text-align:center;padding:24px;z-index:1}
</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/"}}</script>
</head><body>`;

const common = `
const send = m => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m));
const host = document.getElementById('host');
const msg = document.getElementById('msg');
function createStage(THREE, OrbitControls, fov) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eaf0f2');
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 200);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const w = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1);
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); render();
  };
  window.addEventListener('resize', resize);
  controls.addEventListener('change', render);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); send({ type: 'error', code: 'webgl' }); });
  return { scene, camera, controls, renderer, render, resize };
}
`;

function safeJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function sceneHtml(data: RoomScene): string {
  return `${head}
<div id="host"></div>
<div class="bar"><label><input id="walls" type="checkbox" checked>Ver paredes</label><button id="reset">Restablecer vista</button></div>
<div id="msg">Cargando…</div>
<script>
const DATA = ${safeJson(data)};
${common}
function wallPanels(wall) {
  const length = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  if (!isFinite(length) || length <= 0 || wall.heightM <= 0) return [];
  const openings = (wall.openings || []).map(o => ({
    left: Math.max(0, o.offsetM), right: Math.min(length, o.offsetM + o.widthM),
    bottom: Math.max(0, o.sillM), top: Math.min(wall.heightM, o.sillM + o.heightM)
  })).filter(o => o.right > o.left && o.top > o.bottom);
  const uniq = a => Array.from(new Set(a)).sort((p, q) => p - q);
  const xs = uniq([0, length].concat(openings.flatMap(o => [o.left, o.right])));
  const ys = uniq([0, wall.heightM].concat(openings.flatMap(o => [o.bottom, o.top])));
  const panels = [];
  for (let x = 1; x < xs.length; x++) for (let y = 1; y < ys.length; y++) {
    const cx = (xs[x - 1] + xs[x]) / 2, cy = (ys[y - 1] + ys[y]) / 2;
    if (!openings.some(o => cx > o.left && cx < o.right && cy > o.bottom && cy < o.top))
      panels.push({ x: cx, y: cy, width: xs[x] - xs[x - 1], height: ys[y] - ys[y - 1] });
  }
  return panels;
}
(async () => {
  try {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const stage = createStage(THREE, OrbitControls, 45);
    const { scene, camera, controls } = stage;
    const room = DATA.room;
    const walls = new THREE.Group();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x929c9e, 3));
    const sun = new THREE.DirectionalLight(0xffffff, 3); sun.position.set(3, 8, 4); scene.add(sun);
    function box(w, h, l, color, parent, opacity) {
      parent = parent || scene; opacity = opacity === undefined ? 1 : opacity;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l),
        new THREE.MeshStandardMaterial({ color: color, roughness: 0.85, transparent: opacity < 1, opacity: opacity }));
      parent.add(mesh); return mesh;
    }
    const floorColors = { Wood: '#ae825a', Laminate: '#bba18a', Tile: '#e2ddd3', Carpet: '#889ba3', Concrete: '#a2a7a8', Porcelain: '#e4e9e7' };
    const floor = box(room.widthM, 0.1, room.lengthM, floorColors[room.floor] || '#c7bba5');
    floor.position.y = -0.05;
    const size = Math.max(room.widthM, room.lengthM);
    const grid = new THREE.GridHelper(size, Math.ceil(size * 2), '#8c8172', '#b1a38e');
    grid.position.y = 0.003; grid.material.transparent = true; grid.material.opacity = 0.18; scene.add(grid);
    for (const wall of DATA.walls) {
      const angle = Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);
      for (const p of wallPanels(wall)) {
        const mesh = box(p.width, p.height, 0.07, room.wallColor || '#efe9df', walls, 0.45);
        mesh.position.set(wall.start.x + Math.cos(angle) * p.x, p.y, wall.start.z + Math.sin(angle) * p.x);
        mesh.rotation.y = -angle;
      }
    }
    scene.add(walls);
    for (const bed of DATA.beds) {
      const g = new THREE.Group();
      g.position.set(bed.x, 0, bed.z);
      g.rotation.y = THREE.MathUtils.degToRad(bed.rotationDeg);
      const frame = box(bed.widthM, bed.heightM * 0.65, bed.lengthM, '#675544', g); frame.position.y = bed.heightM * 0.325;
      const mattress = box(bed.widthM * 0.98, bed.heightM * 0.35, bed.lengthM * 0.98, '#f5f4ee', g); mattress.position.y = bed.heightM * 0.825;
      const blanket = box(bed.widthM * 0.99, 0.04, bed.lengthM * 0.55, '#447b89', g); blanket.position.set(0, bed.heightM + 0.02, bed.lengthM * 0.16);
      const head = box(bed.widthM + 0.06, bed.heightM * 1.8, 0.09, '#675544', g); head.position.set(0, bed.heightM * 0.9, -bed.lengthM / 2);
      const n = bed.widthM >= 1.3 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const pillow = box(bed.widthM / n * 0.8, 0.12, 0.35, '#ffffff', g);
        pillow.position.set((i - (n - 1) / 2) * bed.widthM / n, bed.heightM + 0.07, -bed.lengthM * 0.32);
      }
      scene.add(g);
    }
    camera.position.set(size * 1.15, size * 1.3, size * 1.35);
    controls.target.set(0, room.heightM * 0.2, 0);
    controls.minDistance = 0.5; controls.maxDistance = size * 5; controls.maxPolarAngle = Math.PI * 0.49;
    controls.update(); controls.saveState();
    stage.resize();
    msg.style.display = 'none';
    document.getElementById('walls').addEventListener('change', e => { walls.visible = e.target.checked; stage.render(); });
    document.getElementById('reset').addEventListener('click', () => { controls.reset(); stage.render(); });
    send({ type: 'ready' });
  } catch (e) {
    msg.textContent = 'No se pudo iniciar el visor 3D. Revisa tu conexión.';
    send({ type: 'error', code: 'webgl' });
  }
})();
</script></body></html>`;
}

export function panoramaHtml(): string {
  return `${head}
<div id="host"></div>
<div class="bar"><button id="zin">+</button><button id="zout">−</button><button id="reset">Restablecer</button></div>
<div id="msg">Cargando…</div>
<script>
window.__pending = null;
window.setPano = function (u) { window.__pending = u; };
${common}
(async () => {
  try {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const stage = createStage(THREE, OrbitControls, 70);
    const { scene, camera, controls } = stage;
    controls.enablePan = false; controls.enableZoom = false; controls.rotateSpeed = -0.4;
    controls.minDistance = 0.01; controls.maxDistance = 0.01;
    let sphere = null, req = 0;
    function reset() {
      camera.position.set(0, 0, 0.01); controls.target.set(0, 0, 0);
      camera.fov = 70; camera.updateProjectionMatrix(); controls.update(); stage.render();
    }
    function zoom(a) { camera.fov = Math.min(100, Math.max(30, camera.fov + a)); camera.updateProjectionMatrix(); stage.render(); }
    document.getElementById('zin').addEventListener('click', () => zoom(-10));
    document.getElementById('zout').addEventListener('click', () => zoom(10));
    document.getElementById('reset').addEventListener('click', reset);
    async function apply(url) {
      const current = ++req;
      if (sphere) { scene.remove(sphere); sphere.geometry.dispose(); sphere.material.map && sphere.material.map.dispose(); sphere.material.dispose(); sphere = null; stage.render(); }
      msg.style.display = 'flex'; msg.textContent = 'Cargando panorama…';
      try {
        const texture = await new THREE.TextureLoader().loadAsync(url);
        if (current !== req) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        const geometry = new THREE.SphereGeometry(20, 64, 32); geometry.scale(-1, 1, 1);
        sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
        scene.add(sphere); reset(); msg.style.display = 'none';
        send({ type: 'ready' });
      } catch (e) {
        if (current === req) { msg.textContent = 'No se pudo mostrar el panorama.'; send({ type: 'error', code: 'texture' }); }
      }
    }
    window.setPano = apply;
    stage.resize(); reset();
    if (window.__pending) apply(window.__pending);
    else msg.textContent = 'Esperando panorama…';
  } catch (e) {
    msg.textContent = 'No se pudo iniciar el visor 360°. Revisa tu conexión.';
    send({ type: 'error', code: 'webgl' });
  }
})();
</script></body></html>`;
}
