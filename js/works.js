// Placeholder works for the first three trail stops.
// The images are generated here so the prototype carries no one else's artwork.
import * as THREE from 'three';
import { noise, rng } from './world.js';

const TAU = Math.PI * 2;

export const WORKS = [
  {
    id: 'TG-001',
    artist: 'Refik Anadol',
    title: null,
    file: 'anadol.jpg',
    layer: 'Sky',
    layerNote: 'the cloud',
    habitat: 'Floating among cumulus, about 30 m above the meadow',
    ratio: 16 / 9,
    width: 4.2,
    paint: paintFlow,
  },
  {
    id: 'TG-002',
    artist: 'Daniel Ambrosi',
    title: null,
    file: 'ambrosi.jpg',
    layer: 'Sky',
    layerNote: 'the cloud',
    habitat: 'Floating about 20 m above the crest of the hill',
    ratio: 2,
    width: 5.2,
    paint: paintDream,
  },
  {
    id: 'TG-003',
    artist: 'Sarah Friend',
    title: 'Touch Grass',
    file: 'touch_grass.gif',
    layer: 'Grass',
    layerNote: 'the surface',
    habitat: 'Staked into the crest of the hill, in short grass',
    ratio: 1,
    width: 2.2,
    paint: paintLawn,
  },
];

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d') };
}

function stamp(g, W, H) {
  const fs = Math.round(W * 0.022);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.font = `700 ${fs}px "Courier Prime", "Courier New", monospace`;
  const text = 'PLACEHOLDER';
  const pad = Math.round(fs * 0.5);
  const tw = g.measureText(text).width;
  g.fillStyle = 'rgba(251,251,246,0.94)';
  g.fillRect(fs, H - fs * 2 - pad * 2, tw + pad * 2, fs + pad * 2);
  g.fillStyle = '#18210f';
  g.textBaseline = 'top';
  g.fillText(text, fs + pad, H - fs * 2 - pad);
}

// A data-pigment flow field: stand-in for a machine-dreamt nature piece.
function paintFlow() {
  const W = 1024, H = 576;
  const { c, g } = canvas(W, H);
  const r = rng(11);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a1024');
  bg.addColorStop(1, '#05070f');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  const pal = ['#35d0c4', '#ff5aa8', '#ffb547', '#8dff73', '#6f8dff'];
  for (let i = 0; i < 2400; i++) {
    let x = r() * W, y = r() * H;
    const pick = Math.min(pal.length - 1, ((noise(x * 0.004, y * 0.004 + 9) * 0.5 + 0.5) * pal.length) | 0);
    g.strokeStyle = pal[pick];
    g.globalAlpha = 0.05 + r() * 0.07;
    g.lineWidth = 0.6 + r() * 1.8;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 46; s++) {
      const a = noise(x * 0.0035, y * 0.0035) * Math.PI * 2.2 + noise(x * 0.011 + 5, y * 0.011) * 0.6;
      x += Math.cos(a) * 4;
      y += Math.sin(a) * 4;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  stamp(g, W, H);
  return c;
}

// A panorama with a hallucinated texture: stand-in for a dreamscape.
function paintDream() {
  const W = 1200, H = 600;
  const { c, g } = canvas(W, H);
  const r = rng(23);
  const sky = g.createLinearGradient(0, 0, 0, H * 0.6);
  sky.addColorStop(0, '#8fb9e2');
  sky.addColorStop(1, '#f1d8c6');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const hills = ['#8faa9f', '#6f9a6a', '#4f8a3c', '#3b6f26'];
  const ridge = (layer, x) => H * (0.42 + layer * 0.13) - (noise(x * 0.004 + layer * 10, layer * 3.7) * 0.5 + 0.5) * H * 0.17;
  hills.forEach((col, layer) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, ridge(layer, x));
    g.lineTo(W, H);
    g.closePath();
    g.fill();
  });
  for (let i = 0; i < 1500; i++) {
    const x = r() * W;
    const layer = (r() * 4) | 0;
    const top = ridge(layer, x);
    const y = top + r() * (H - top);
    const rad = 2 + r() * 7;
    const hue = (noise(x * 0.01, y * 0.01) * 0.5 + 0.5) * 360;
    for (let k = 3; k > 0; k--) {
      g.fillStyle = `hsla(${(hue + k * 40) % 360}, 70%, ${45 + k * 10}%, 0.55)`;
      g.beginPath();
      g.arc(x, y, (rad * k) / 3, 0, TAU);
      g.fill();
    }
  }
  stamp(g, W, H);
  return c;
}

// A lawn from above with a pressed patch where someone touched it.
function paintLawn() {
  const W = 800, H = 800;
  const { c, g } = canvas(W, H);
  const r = rng(37);
  g.fillStyle = '#2f5d17';
  g.fillRect(0, 0, W, H);
  const cx = W * 0.52, cy = H * 0.5, R = W * 0.24;
  for (let i = 0; i < 14000; i++) {
    const x = r() * W, y = r() * H;
    const dx = x - cx, dy = y - cy;
    const inside = Math.hypot(dx, dy) < R * (0.9 + noise(x * 0.02, y * 0.02) * 0.12);
    const a = inside ? Math.atan2(dy, dx) + Math.PI / 2 + (r() - 0.5) * 0.4 : -Math.PI / 2 + (r() - 0.5) * 1.1;
    const len = inside ? 10 + r() * 12 : 6 + r() * 9;
    const light = inside ? 52 + r() * 14 : 22 + r() * 22;
    g.strokeStyle = `hsl(${88 + r() * 22}, ${inside ? 45 : 60}%, ${light}%)`;
    g.lineWidth = 1 + r() * 1.6;
    g.globalAlpha = 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  stamp(g, W, H);
  return c;
}

function thumb(c, size) {
  const s = size / Math.max(c.width, c.height);
  const { c: t, g } = canvas(Math.round(c.width * s), Math.round(c.height * s));
  g.drawImage(c, 0, 0, t.width, t.height);
  return t.toDataURL('image/png');
}

export function paintWorks() {
  for (const w of WORKS) {
    w.canvas = w.paint();
    w.src = w.canvas.toDataURL('image/jpeg', 0.9);
    w.thumb = thumb(w.canvas, 96);
  }
}

// A mounted print. Grounded works stand on two stakes.
export function makeFrame(work, { grounded = false } = {}) {
  const w = work.width, h = w / work.ratio;
  const group = new THREE.Group();
  const tex = new THREE.CanvasTexture(work.canvas);
  tex.anisotropy = 8;
  const mats = [];
  const imgMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 });
  const image = new THREE.Mesh(new THREE.PlaneGeometry(w, h), imgMat);
  image.position.z = 0.02;
  image.userData.work = work;
  const m = Math.max(0.12, w * 0.035);
  const mountMat = new THREE.MeshBasicMaterial({ color: 0xf4f3ee, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const mount = new THREE.Mesh(new THREE.PlaneGeometry(w + m * 2, h + m * 2), mountMat);
  group.add(mount, image);
  mats.push(imgMat, mountMat);
  if (grounded) {
    const stakeMat = new THREE.MeshBasicMaterial({ color: 0x5b4632, transparent: true, opacity: 0 });
    const stakeH = 3.2;
    for (const sx of [-w * 0.32, w * 0.32]) {
      const stake = new THREE.Mesh(new THREE.BoxGeometry(0.06, stakeH, 0.06), stakeMat);
      stake.position.set(sx, -h / 2 - stakeH / 2 + 0.6, -0.05);
      group.add(stake);
    }
    mats.push(stakeMat);
  }
  return {
    group,
    image,
    w,
    h,
    setOpacity(o) {
      for (const mat of mats) mat.opacity = o;
      group.visible = o > 0.001;
    },
  };
}
