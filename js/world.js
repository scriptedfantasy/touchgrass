// The landscape behind the wallpaper: terrain, grass, sky and clouds.
// Colours are written as display values; colour management is switched off in main.js.
import * as THREE from 'three';

const TAU = Math.PI * 2;

// --- deterministic randomness ---------------------------------------------

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(ix, iz) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Smooth value noise in [-1, 1].
export function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1;
}

// --- terrain ----------------------------------------------------------------

function bump(x, z, cx, cz, rx, rz, h) {
  const dx = (x - cx) / rx, dz = (z - cz) / rz;
  return h * Math.exp(-(dx * dx + dz * dz));
}

// Metres. The camera starts at z = 58 looking towards -z.
export function heightAt(x, z) {
  return (
    bump(x, z, 14, -24, 78, 34, 17) + // the wallpaper hill
    bump(x, z, 72, -8, 42, 30, 6) + // its right shoulder
    bump(x, z, -150, -170, 80, 50, 24) + // distant hills
    bump(x, z, 170, -240, 100, 55, 30) +
    bump(x, z, -20, -330, 170, 60, 22) +
    0.5 * noise(x * 0.016 + 3.1, z * 0.016 - 7.3)
  );
}

export const SUN_DIR = new THREE.Vector3(-0.5, 0.75, 0.45).normalize();
export const HORIZON = new THREE.Color(0.78, 0.87, 0.96);

const GLSL_NOISE = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float cloudShadow(vec2 xz, float t) {
  vec2 p = xz * 0.011 + vec2(t * 0.010, t * 0.004);
  float n = vnoise(p) * 0.62 + vnoise(p * 2.7 + 4.1) * 0.38;
  return mix(1.0, 0.74, smoothstep(0.56, 0.74, n));
}
vec3 meadow(vec2 xz) {
  float n = vnoise(xz * 0.045) * 0.6 + vnoise(xz * 0.21) * 0.4;
  return mix(vec3(0.20, 0.44, 0.07), vec3(0.36, 0.62, 0.13), n);
}
`;

function fogUniforms() {
  return THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
}

function makeGround(shared) {
  // A warped grid: dense where people walk, coarse towards the horizon.
  const N = 256, EXT = 1400, P = 1.7, CX = 6, CZ = -6;
  const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), P) * EXT;
  const pos = new Float32Array((N + 1) * (N + 1) * 3);
  let k = 0;
  for (let j = 0; j <= N; j++) {
    const z = CZ + warp((j / N) * 2 - 1);
    for (let i = 0; i <= N; i++) {
      const x = CX + warp((i / N) * 2 - 1);
      pos[k++] = x;
      pos[k++] = heightAt(x, z);
      pos[k++] = z;
    }
  }
  const idx = new Uint32Array(N * N * 6);
  k = 0;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
      idx[k++] = a; idx[k++] = c; idx[k++] = b;
      idx[k++] = b; idx[k++] = c; idx[k++] = d;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();

  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: { ...fogUniforms(), uTime: shared.uTime, uSun: shared.uSun },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormal;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSun;
      varying vec3 vWorld;
      varying vec3 vNormal;
      #include <fog_pars_fragment>
      ${GLSL_NOISE}
      void main() {
        float diff = clamp(dot(normalize(vNormal), uSun), 0.0, 1.0);
        vec3 col = meadow(vWorld.xz) * (0.62 + 0.55 * diff);
        col *= cloudShadow(vWorld.xz, uTime);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

// --- grass ------------------------------------------------------------------

function makeGrass(shared, lowPower) {
  const SEG = 4;
  const verts = [];
  for (let s = 0; s < SEG; s++) {
    const y = s / SEG;
    const hw = 0.5 * Math.pow(1 - y, 0.9);
    verts.push(-hw, y, 0, hw, y, 0);
  }
  verts.push(0, 1, 0);
  const index = [];
  for (let s = 0; s < SEG - 1; s++) {
    const a = s * 2, b = a + 1, c = a + 2, d = a + 3;
    index.push(a, b, c, b, d, c);
  }
  const last = (SEG - 1) * 2;
  index.push(last, last + 1, SEG * 2);

  // Patches of blades: dense at the centre, coarser and larger towards the edge.
  const patches = [
    // the meadow in front of the wallpaper camera
    { cx: 0, cz: 50, R: 95, n: lowPower ? 26000 : 60000, k: 1.4, w: [0.06, 0.42], h: [0.55, 1.4], avoid: { x: 10.5, z: -24.5, r: 30 } },
    // the crest where the grass stop stands
    { cx: 10.5, cz: -24.5, R: 34, n: lowPower ? 24000 : 50000, k: 1.65, w: [0.04, 0.22], h: [0.32, 0.9] },
  ];
  const total = patches.reduce((s, p) => s + p.n, 0);
  const offsets = new Float32Array(total * 3);
  const params = new Float32Array(total * 4);
  const r = rng(1234);
  let i = 0;
  for (const p of patches) {
    for (let n = 0; n < p.n; n++, i++) {
      const t = Math.pow(r(), p.k);
      const a = r() * TAU;
      let x = p.cx + Math.cos(a) * t * p.R;
      let z = p.cz + Math.sin(a) * t * p.R;
      // The far-viewing blades are too big to stand next to; keep them off the crest.
      if (p.avoid) {
        const dx = x - p.avoid.x, dz = z - p.avoid.z;
        const dist = Math.hypot(dx, dz);
        if (dist < p.avoid.r) {
          const push = (p.avoid.r + r() * 8) / Math.max(0.01, dist);
          x = p.avoid.x + dx * push;
          z = p.avoid.z + dz * push;
        }
      }
      offsets[i * 3] = x;
      offsets[i * 3 + 1] = heightAt(x, z) - 0.03;
      offsets[i * 3 + 2] = z;
      params[i * 4] = r() * TAU; // yaw
      params[i * 4 + 1] = (p.w[0] + (p.w[1] - p.w[0]) * t) * (0.7 + 0.6 * r()); // width
      params[i * 4 + 2] = (p.h[0] + (p.h[1] - p.h[0]) * t) * (0.6 + 0.8 * r()); // height
      params[i * 4 + 3] = r(); // colour variation
    }
  }

  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(index);
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
  geo.instanceCount = total;

  const mat = new THREE.ShaderMaterial({
    fog: true,
    side: THREE.DoubleSide,
    uniforms: {
      ...fogUniforms(),
      uTime: shared.uTime,
      uSun: shared.uSun,
      uWind: shared.uWind,
      uTouch: shared.uTouch,
      uTouchAmt: shared.uTouchAmt,
    },
    vertexShader: /* glsl */ `
      attribute vec3 aOffset;
      attribute vec4 aParams;
      uniform float uTime;
      uniform float uWind;
      uniform vec3 uTouch;
      uniform float uTouchAmt;
      varying float vY;
      varying float vVar;
      varying float vDist;
      varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        float y = position.y;
        float c = cos(aParams.x), s = sin(aParams.x);
        vec3 p = vec3(position.x * aParams.y, y * aParams.z, 0.0);
        p = vec3(c * p.x, p.y, -s * p.x);
        vec3 world = aOffset + p;
        float k = y * y;

        // wind: slow rolling gusts plus a little flutter
        float gust = sin(aOffset.x * 0.08 + uTime * 1.1) * 0.5
                   + sin(aOffset.z * 0.11 + aOffset.x * 0.03 + uTime * 0.7) * 0.5;
        float flutter = sin(uTime * 4.0 + aOffset.x * 1.7 + aOffset.z * 1.3) * 0.15;
        float bend = (gust * 0.6 + flutter + 0.35) * uWind;
        vec2 windDir = normalize(vec2(1.0, 0.35));
        world.xz += windDir * bend * k * aParams.z * 0.45;
        world.y -= abs(bend) * k * aParams.z * 0.12;

        // touch: blades lean away from the cursor or finger
        vec2 d = aOffset.xz - uTouch.xz;
        float dist = length(d);
        float push = uTouchAmt * (1.0 - smoothstep(0.0, 1.5, dist));
        world.xz += (d / max(dist, 0.001)) * push * k * aParams.z * 0.95;
        world.y -= push * k * aParams.z * 0.5;

        vY = y;
        vVar = aParams.w;
        vWorld = world;
        vec4 mvPosition = viewMatrix * vec4(world, 1.0);
        vDist = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying float vY;
      varying float vVar;
      varying float vDist;
      varying vec3 vWorld;
      #include <fog_pars_fragment>
      ${GLSL_NOISE}
      void main() {
        vec3 base = vec3(0.10, 0.27, 0.04);
        vec3 tip = mix(vec3(0.44, 0.70, 0.14), vec3(0.64, 0.80, 0.24), vVar);
        vec3 col = mix(base, tip, smoothstep(0.0, 0.95, vY));
        col *= 0.86 + 0.28 * vVar;
        vec3 ground = meadow(vWorld.xz) * 1.06;
        col = mix(col, ground, smoothstep(30.0, 140.0, vDist) * 0.55);
        col *= cloudShadow(vWorld.xz, uTime);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

// --- sky --------------------------------------------------------------------

function makeSky(shared) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: { uSun: shared.uSun, uTime: shared.uTime },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun;
      uniform float uTime;
      varying vec3 vDir;
      ${GLSL_NOISE}
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
        return v;
      }
      void main() {
        vec3 d = normalize(vDir);
        vec3 hor = vec3(0.78, 0.87, 0.96);
        vec3 mid = vec3(0.45, 0.66, 0.92);
        vec3 zen = vec3(0.16, 0.39, 0.80);
        vec3 col = mix(hor, mid, smoothstep(-0.02, 0.22, d.y));
        col = mix(col, zen, smoothstep(0.22, 0.75, d.y));
        float s = max(dot(d, uSun), 0.0);
        col += vec3(1.0, 0.96, 0.85) * (pow(s, 400.0) * 1.2 + pow(s, 12.0) * 0.12);

        // distant cumulus painted onto a cloud deck
        if (d.y > 0.0) {
          vec2 p = d.xz / (d.y + 0.12) * 1.4 + vec2(uTime * 0.006, 0.0);
          float n = fbm(p);
          float lit = fbm(p + vec2(0.06, 0.1));
          float cover = smoothstep(0.50, 0.70, n) * smoothstep(0.0, 0.08, d.y) * (1.0 - smoothstep(0.35, 0.8, d.y) * 0.65);
          float shade = clamp(0.86 + (n - lit) * 4.0, 0.62, 1.0);
          vec3 cloud = mix(vec3(0.66, 0.73, 0.86), vec3(1.0), shade);
          col = mix(col, cloud, cover * 0.96);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), mat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  return sky;
}

// --- clouds -----------------------------------------------------------------

function puffTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const r = rng(99);
  for (let i = 0; i < 22; i++) {
    const x = S / 2 + (r() - 0.5) * S * 0.4;
    const y = S / 2 + (r() - 0.5) * S * 0.4;
    const rad = S * (0.14 + r() * 0.22);
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, 'rgba(255,255,255,0.32)');
    grd.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, rad, 0, TAU);
    g.fill();
  }
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(0.45, 'rgba(0,0,0,0.7)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function distToSegment(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const apx = p[0] - a.x, apy = p[1] - a.y, apz = p[2] - a.z;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / (abx * abx + aby * aby + abz * abz)));
  const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function makeClouds(shared, clearings) {
  const r = rng(7);
  const puffs = [];
  function cluster(cx, cy, cz, sx, sy, sz, count, size) {
    for (let i = 0; i < count; i++) {
      let dx, dy, dz;
      do {
        dx = r() * 2 - 1;
        dy = r();
        dz = r() * 2 - 1;
      } while (dx * dx + dy * dy + dz * dz > 1);
      const spread = 1 - 0.45 * (dx * dx + dz * dz); // domed top, flat base
      puffs.push([
        cx + dx * sx,
        cy + dy * sy * spread,
        cz + dz * sz,
        size * (0.6 + 0.7 * r()) * (1 - 0.3 * dy),
        0.25 + 0.75 * dy,
        r(),
      ]);
    }
  }
  // Clouds the trail flies through. The distant sky is painted in the sky shader.
  const near = [
    [-19, 31, -3], [5, 29, 7], [-9, 42, -23], [28, 36, -15],
    [9, 46, -46], [33, 43, -43], [-15, 27, 21],
  ];
  for (const [x, y, z] of near) cluster(x, y, z, 12 + r() * 5, 5 + r() * 3, 9 + r() * 4, 16, 11 + r() * 4);

  // Keep the view from each sky stop to its work clear.
  const kept = puffs.filter((p) =>
    clearings.every(({ from, to, radius }) => distToSegment(p, from, to) > radius + p[3] * 0.6)
  );

  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', quad.getAttribute('position'));
  geo.setAttribute('uv', quad.getAttribute('uv'));
  geo.setIndex(quad.getIndex());
  const aPuff = new THREE.InstancedBufferAttribute(new Float32Array(kept.length * 4), 4);
  const aShade = new THREE.InstancedBufferAttribute(new Float32Array(kept.length * 2), 2);
  aPuff.setUsage(THREE.DynamicDrawUsage);
  aShade.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aPuff', aPuff);
  geo.setAttribute('aShade', aShade);
  geo.instanceCount = kept.length;

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: shared.uTime, uTex: { value: puffTexture() } },
    vertexShader: /* glsl */ `
      attribute vec4 aPuff;
      attribute vec2 aShade;
      uniform float uTime;
      varying vec2 vUv;
      varying float vShade;
      varying float vFade;
      varying float vRot;
      void main() {
        vec3 c = aPuff.xyz;
        c.x += sin(uTime * 0.05 + aShade.y * 10.0) * 2.5;
        vec4 mv = viewMatrix * vec4(c, 1.0);
        mv.xy += position.xy * aPuff.w;
        float d = -mv.z;
        vFade = smoothstep(1.0, 7.0, d) * (1.0 - smoothstep(1200.0, 1500.0, d));
        vUv = uv;
        vShade = aShade.x;
        vRot = aShade.y * 6.2831;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex;
      varying vec2 vUv;
      varying float vShade;
      varying float vFade;
      varying float vRot;
      void main() {
        vec2 q = vUv - 0.5;
        q = mat2(cos(vRot), -sin(vRot), sin(vRot), cos(vRot)) * q;
        float a = texture2D(uTex, q + 0.5).a * vFade;
        if (a < 0.004) discard;
        vec3 shadow = vec3(0.70, 0.76, 0.87);
        vec3 col = mix(shadow, vec3(1.0), clamp(vShade * 0.6 + vUv.y * 0.55, 0.0, 1.0));
        gl_FragColor = vec4(col, a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10; // after the works, so puffs in front of a frame still show

  // Back-to-front sorting so overlapping puffs blend correctly.
  const order = kept.map((_, i) => i);
  const depth = new Float32Array(kept.length);
  function sort(camPos) {
    for (let i = 0; i < kept.length; i++) {
      const p = kept[i];
      const dx = p[0] - camPos.x, dy = p[1] - camPos.y, dz = p[2] - camPos.z;
      depth[i] = dx * dx + dy * dy + dz * dz;
    }
    order.sort((a, b) => depth[b] - depth[a]);
    for (let i = 0; i < order.length; i++) {
      const p = kept[order[i]];
      aPuff.setXYZW(i, p[0], p[1], p[2], p[3]);
      aShade.setXY(i, p[4], p[5]);
    }
    aPuff.needsUpdate = true;
    aShade.needsUpdate = true;
  }
  return { mesh, sort };
}

// --- assembly ---------------------------------------------------------------

export function buildWorld(scene, { lowPower, clearings }) {
  const shared = {
    uTime: { value: 0 },
    uSun: { value: SUN_DIR.clone() },
    uWind: { value: 0.28 },
    uTouch: { value: new THREE.Vector3(0, -999, 0) },
    uTouchAmt: { value: 0 },
  };
  scene.fog = new THREE.Fog(HORIZON.clone(), 140, 1100);
  const sky = makeSky(shared);
  const ground = makeGround(shared);
  const grass = makeGrass(shared, lowPower);
  const clouds = makeClouds(shared, clearings);
  scene.add(sky, ground, grass, clouds.mesh);

  const lastSort = new THREE.Vector3(1e9, 0, 0);
  return {
    uniforms: shared,
    update(camera) {
      sky.position.copy(camera.position);
      if (camera.position.distanceToSquared(lastSort) > 0.04) {
        clouds.sort(camera.position);
        lastSort.copy(camera.position);
      }
    },
  };
}
