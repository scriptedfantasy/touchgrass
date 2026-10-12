// Touch Grass: the desktop, the way through the screen, and the trail.
import * as THREE from 'three';
import { buildWorld, heightAt } from './world.js';
import { WORKS, paintWorks, makeFrame } from './works.js';

THREE.ColorManagement.enabled = false;

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rad = (d) => (d * Math.PI) / 180;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const lowPower = coarse || Math.min(innerWidth, innerHeight) < 620;

// Durations in ms.
const T = reduceMotion
  ? { saver: 500, zoom: 900, dolly: 1400, undolly: 900, unzoom: 700 }
  : { saver: 1500, zoom: 2600, dolly: 3800, undolly: 1900, unzoom: 1700 };
const IDLE_MS = 15000;
const BOOT_MS = 1400;
const WALL_FOV = rad(44);
const NEAR = 0.1;
const FAR = 3200;

// --- DOM --------------------------------------------------------------------

const root = document.documentElement;
const canvas = $('#gl');
const stage = $('#stage');
const room = $('#room');
const desktop = $('#desktop');
const crt = $('#crt');
const boot = $('#boot');
const readme = $('#readme');
const dialog = $('#dialog');
const startMenu = $('#startmenu');
const startBtn = $('#start-btn');
const fieldUI = $('#field-ui');
const hint = $('#hint');
const stopCard = $('#stop-card');
const endCard = $('#end-card');
const core = $('#core');
const coreMark = $('#core-mark');
const sheet = $('#sheet');
const trail = $('#trail');

// --- layout of the room -----------------------------------------------------

const view = { w: innerWidth, h: innerHeight };
const hole = { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0, r: 0 };
let sEnd = 4;

function layout() {
  view.w = innerWidth;
  view.h = innerHeight;
  const { w: vw, h: vh } = view;
  const portrait = vw / vh < 0.85;
  const sw = Math.round(portrait ? vw * 0.86 : Math.min(vw * 0.5, ((vh * 0.55) * 4) / 3));
  const sh = Math.round(sw * 0.75);
  const pad = Math.round(sw * 0.065);
  const padb = Math.round(sw * 0.13);
  const neck = Math.round(sw * 0.07);
  const base = Math.round(sw * 0.035);
  const cy = Math.round(portrait ? vh * 0.4 : vh * 0.42);
  const sx = Math.round(vw / 2 - sw / 2);
  const sy = Math.round(cy - sh / 2);
  const deskY = sy + sh + padb + neck + Math.round(base * 0.4);
  Object.assign(hole, { x: sx, y: sy, w: sw, h: sh, cx: sx + sw / 2, cy: sy + sh / 2, r: Math.round(sw * 0.022) });

  const vars = { sw, sh, sx, sy, pad, padb, neck, base, 'desk-y': deskY, sr: hole.r, u: sw / 100 };
  for (const [k, v] of Object.entries(vars)) stage.style.setProperty(`--${k}`, `${v}px`);
  stage.style.transformOrigin = `${hole.cx}px ${hole.cy}px`;
  room.style.clipPath = holePath();

  const free = (vw - (sw + pad * 2)) / 2;
  stage.dataset.fit = free > sw * 0.6 ? 'full' : free > sw * 0.22 ? 'speakers' : 'none';

  const hw = hole.w / 2, hh = hole.h / 2;
  sEnd = 1.18 * Math.max(hole.cx / hw, (vw - hole.cx) / hw, hole.cy / hh, (vh - hole.cy) / hh);
}

// The room is cut open where the glass is, so the 3D world shows through.
function holePath() {
  const { w: vw, h: vh } = view;
  const { x, y, w, h, r } = hole;
  const x1 = x + w, y1 = y + h;
  return `path(evenodd, "M0 0H${vw}V${vh}H0Z M${x + r} ${y}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x + r}A${r} ${r} 0 0 1 ${x} ${y1 - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z")`;
}

function setStageScale(s) {
  stage.style.transform = s === 1 ? '' : `scale(${s})`;
}

// --- camera framing ---------------------------------------------------------
// While the monitor is on screen, the camera's frustum is built so the glass
// shows exactly the wallpaper framing. Scaling the room and widening the
// frustum together keeps the picture locked to the bezel as we move in.

const bCur = { l: 0, r: 0, t: 0, b: 0 };
const bA = { l: 0, r: 0, t: 0, b: 0 };
const bB = { l: 0, r: 0, t: 0, b: 0 };

function holeBounds(s, out) {
  const tv = Math.tan(WALL_FOV / 2);
  const th = tv * (hole.w / hole.h);
  const hw = (hole.w * s) / 2, hh = (hole.h * s) / 2;
  out.l = (NEAR * th * (0 - hole.cx)) / hw;
  out.r = (NEAR * th * (view.w - hole.cx)) / hw;
  out.t = (NEAR * tv * (hole.cy - 0)) / hh;
  out.b = (NEAR * tv * (hole.cy - view.h)) / hh;
  return out;
}

function fieldFov() {
  const aspect = view.w / view.h;
  return clamp(2 * Math.atan(Math.tan(rad(31)) / aspect), rad(50), rad(78));
}

function fieldBounds(out) {
  const t = NEAR * Math.tan(fieldFov() / 2);
  const r = (t * view.w) / view.h;
  out.l = -r; out.r = r; out.t = t; out.b = -t;
  return out;
}

function mixBounds(a, b, k, out) {
  out.l = lerp(a.l, b.l, k);
  out.r = lerp(a.r, b.r, k);
  out.t = lerp(a.t, b.t, k);
  out.b = lerp(a.b, b.b, k);
  return out;
}

// --- three.js setup ---------------------------------------------------------

let renderer;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, NEAR, FAR);
let world;

const WALL_POS = new THREE.Vector3(0, heightAt(0, 58) + 1.7, 58);
const WALL_LOOK = new THREE.Vector3(8, 31, -40);

// Trail stops. `facing` points from the work towards the visitor.
const STOPS = [
  { work: WORKS[0], at: new THREE.Vector3(-6, 33, -6), facing: new THREE.Vector3(0.25, 0, 1) },
  { work: WORKS[1], at: new THREE.Vector3(17, 38.5, -30), facing: new THREE.Vector3(-0.55, 0, 1) },
  { work: WORKS[2], at: new THREE.Vector3(11, heightAt(11, -27) + 1.7, -27), facing: new THREE.Vector3(0.15, 0, 1), grounded: true },
];
const N_PTS = 7;
const STOP_IDX = [1, 3, 5];
const END_IDX = 6;
let posCurve, lookCurve;
const dollyCtrl = new THREE.Vector3(0.5, heightAt(0.5, 30) + 4, 30);
let P0 = new THREE.Vector3();
let P0look = new THREE.Vector3();

function fitDistance(w, h) {
  const tv = Math.tan(fieldFov() / 2);
  const th = tv * (view.w / view.h);
  return Math.max(h / 2 / tv, w / 2 / th);
}

function buildPath() {
  for (const s of STOPS) {
    const n = s.facing.clone().setY(0).normalize();
    const d = fitDistance(s.frame.w, s.frame.h) * (s.grounded ? 2.1 : 2.0);
    const cam = s.at.clone().addScaledVector(n, d);
    if (s.grounded) cam.y = Math.max(s.at.y + 0.1, heightAt(cam.x, cam.z) + 1.55);
    else cam.y += 0.3;
    s.cam = cam;
    s.look = s.at.clone().add(new THREE.Vector3(0, -s.frame.h * 0.2, 0));
  }
  const [A, B, C] = STOPS;
  P0 = A.cam.clone().add(new THREE.Vector3(2.5, -5, 15));
  P0look = A.at.clone().add(new THREE.Vector3(0, 1.5, 0));
  const M1 = new THREE.Vector3(3, 37.5, -9);
  const M1look = new THREE.Vector3(13, 38.5, -26);
  const M2 = new THREE.Vector3(14, 29, -13);
  const M2look = C.at.clone().add(new THREE.Vector3(0, -3, -1));
  const E = C.cam.clone().add(new THREE.Vector3(-2.2, 0, 0.4));
  E.y = heightAt(E.x, E.z) + 1.5;
  const Elook = new THREE.Vector3(E.x - 0.4, heightAt(E.x - 0.4, E.z - 1.6), E.z - 1.6);
  posCurve = new THREE.CatmullRomCurve3([P0, A.cam, M1, B.cam, M2, C.cam, E], false, 'centripetal');
  lookCurve = new THREE.CatmullRomCurve3([P0look, A.look, M1look, B.look, M2look, C.look, Elook], false, 'centripetal');
}

const pose = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
const saved = { pos: new THREE.Vector3(), look: new THREE.Vector3(), bounds: { l: 0, r: 0, t: 0, b: 0 } };
const tmp = new THREE.Vector3();

function wallPose() {
  pose.pos.copy(WALL_POS);
  pose.look.copy(WALL_LOOK);
}

function dollyPose(e) {
  const u = 1 - e;
  pose.pos
    .copy(WALL_POS).multiplyScalar(u * u)
    .addScaledVector(dollyCtrl, 2 * u * e)
    .addScaledVector(P0, e * e);
  pose.look.lerpVectors(WALL_LOOK, P0look, smooth(e));
}

function pathPose(p) {
  const t = clamp(p / (N_PTS - 1), 0, 1);
  posCurve.getPoint(t, pose.pos);
  lookCurve.getPoint(t, pose.look);
}

function keepAboveGround(v, clearance) {
  v.y = Math.max(v.y, heightAt(v.x, v.z) + clearance);
}

// --- state ------------------------------------------------------------------

let state = 'boot';
let tState = 0;
let lastInput = performance.now();
let windTarget = 0.28;
let pTarget = 0;
let pS = 0;
let seg = 600;
let sheetOpen = false;
let cardStop = -1;
const look = { x: 0, y: 0, tx: 0, ty: 0 };
const touch = { pos: new THREE.Vector3(0, -999, 0), target: new THREE.Vector3(0, -999, 0), amt: 0, until: 0 };

function setState(s) {
  state = s;
  tState = 0;
  root.dataset.state = s;
}

function startSaver() {
  if (state !== 'desktop') return;
  closeMenus();
  for (const icon of $$('.icon', desktop)) {
    const r = icon.getBoundingClientRect();
    icon.style.setProperty('--fall', `${Math.max(20, hole.y + hole.h * 0.96 - r.top)}px`);
    icon.style.setProperty('--rot', `${(Math.random() - 0.5) * 120}deg`);
  }
  desktop.classList.remove('return');
  desktop.classList.add('saver');
  setState('saver');
}

function enterField() {
  setState('field');
  root.classList.add('is-field');
  sizeTrail();
  window.scrollTo(0, 0);
  pTarget = pS = 0;
  cardStop = -1;
  fieldUI.hidden = false;
}

function goInside() {
  if (state !== 'field') return;
  closeSheet();
  saved.pos.copy(camera.position);
  saved.look.copy(pose.look);
  Object.assign(saved.bounds, bCur);
  fieldUI.hidden = true;
  root.classList.remove('is-field');
  trail.style.height = '0px';
  window.scrollTo(0, 0);
  setState('undolly');
}

function restoreDesktop() {
  setStageScale(1);
  crt.style.opacity = '';
  desktop.classList.remove('saver');
  desktop.classList.add('return');
  readme.hidden = false;
  setTimeout(() => desktop.classList.remove('return'), 1200);
  lastInput = performance.now();
  setState('desktop');
}

// --- trail scrolling --------------------------------------------------------

function buildTrailMarkers() {
  for (const i of [0, ...STOP_IDX, END_IDX]) {
    const m = document.createElement('div');
    m.className = 'snap';
    m.dataset.i = i;
    trail.append(m);
  }
}

function sizeTrail() {
  seg = Math.round(Math.max(480, view.h * 0.85));
  trail.style.height = `${(N_PTS - 1) * seg + view.h}px`;
  for (const m of $$('.snap', trail)) m.style.top = `${Number(m.dataset.i) * seg}px`;
}

addEventListener('scroll', () => {
  if (state === 'field') pTarget = clamp(scrollY / seg, 0, N_PTS - 1);
}, { passive: true });

// --- field UI ---------------------------------------------------------------

function fillCard(i) {
  const w = STOPS[i].work;
  $('#lc-layer').textContent = `${w.layer} · ${w.layerNote}`;
  $('#lc-count').textContent = `Stop ${i + 1} of ${STOPS.length}`;
  $('#lc-artist').textContent = w.artist;
  $('#lc-title').textContent = w.title ?? 'Work to be confirmed';
  cardStop = i;
}

function showEl(el, o) {
  el.style.opacity = String(o);
  el.style.visibility = o > 0.02 ? 'visible' : 'hidden';
}

function updateFieldUI() {
  let best = -1, bestProx = 0;
  STOP_IDX.forEach((idx, i) => {
    const prox = 1 - Math.abs(pS - idx) / 0.5;
    if (prox > bestProx) { bestProx = prox; best = i; }
  });
  if (best >= 0 && best !== cardStop) fillCard(best);
  showEl(stopCard, best >= 0 ? smooth(clamp(bestProx * 1.6, 0, 1)) : 0);
  showEl(endCard, smooth(clamp((1 - (END_IDX - pS) / 0.5) * 1.6, 0, 1)));
  showEl(hint, clamp(1 - pS / 0.3, 0, 1) * clamp(tState / 700, 0, 1));

  // Depth marker on the core sample: sky takes points 0–4, grass 4–6.
  const skyFrac = 2 / 6, grassFrac = 1 / 6;
  const y = pS < 4 ? (pS / 4) * skyFrac : skyFrac + ((pS - 4) / 2) * grassFrac;
  coreMark.style.top = `${y * 100}%`;
  const layer = pS < 4.5 ? 'sky' : 'grass';
  if (core.dataset.here !== layer) core.dataset.here = layer;
}

function openSheet(i) {
  const w = STOPS[i].work;
  $('#sh-acc').textContent = w.id;
  $('#sh-img').src = w.src;
  $('#sh-img').alt = `Placeholder image standing in for the work by ${w.artist}`;
  $('#sh-taxon').textContent = w.title ?? 'Work to be confirmed';
  $('#sh-coll').textContent = w.artist;
  $('#sh-layer').textContent = `${w.layer}, ${w.layerNote}`;
  $('#sh-hab').textContent = w.habitat;
  sheet.hidden = false;
  sheetOpen = true;
  $('#sh-close').focus();
}

function closeSheet() {
  if (!sheetOpen) return;
  sheet.hidden = true;
  sheetOpen = false;
}

// --- desktop UI -------------------------------------------------------------

function closeMenus() {
  startMenu.hidden = true;
  startBtn.setAttribute('aria-expanded', 'false');
  dialog.hidden = true;
}

function showDialog(title, msg, canGoOutside) {
  $('#dlg-title').textContent = title;
  $('#dlg-msg').textContent = msg;
  $('[data-act="outside"]', dialog).hidden = !canGoOutside;
  dialog.hidden = false;
  $('[data-act="ok"]', dialog).focus();
}

function openIcon(icon) {
  const kind = icon.dataset.kind;
  if (kind === 'readme') readme.hidden = false;
  else if (kind === 'compost') showDialog('Compost', 'Compost is empty.', false);
  else showDialog('File moved', `${icon.dataset.file} has been moved outside.`, true);
}

let lastPointerType = 'mouse';
desktop.addEventListener('pointerdown', (e) => { lastPointerType = e.pointerType; });

for (const icon of $$('.icon', desktop)) {
  icon.addEventListener('click', () => {
    for (const other of $$('.icon.sel', desktop)) other.classList.remove('sel');
    icon.classList.add('sel');
    if (lastPointerType !== 'mouse') openIcon(icon);
  });
  icon.addEventListener('dblclick', () => openIcon(icon));
  icon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openIcon(icon);
  });
}

desktop.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'outside') startSaver();
  else if (act === 'ok') dialog.hidden = true;
  else if (act === 'readme') { readme.hidden = false; closeMenus(); }
  if (!e.target.closest('#startmenu, #start-btn') && !startMenu.hidden) {
    startMenu.hidden = true;
    startBtn.setAttribute('aria-expanded', 'false');
  }
});

startBtn.addEventListener('click', () => {
  const open = startMenu.hidden;
  startMenu.hidden = !open;
  startBtn.setAttribute('aria-expanded', String(open));
});
$('#showdesk').addEventListener('click', () => startSaver());
$('#readme-close').addEventListener('click', () => { readme.hidden = true; });

function tickClock() {
  const d = new Date();
  $('#clock').textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
tickClock();
setInterval(tickClock, 15000);

// --- input ------------------------------------------------------------------

function noteInput() {
  lastInput = performance.now();
}
for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) {
  addEventListener(ev, noteInput, { passive: true });
}

addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (sheetOpen) closeSheet();
  else if (state === 'field') goInside();
  else if (state === 'desktop') closeMenus();
});

$('#back-inside').addEventListener('click', goInside);
$('#end-back').addEventListener('click', goInside);
$('#lc-open').addEventListener('click', () => openSheet(cardStop));
$('#sh-close').addEventListener('click', closeSheet);
sheet.addEventListener('click', (e) => {
  if (e.target === sheet) closeSheet();
});

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let frameMeshes = [];

function toNdc(x, y) {
  ndc.set((x / view.w) * 2 - 1, -(y / view.h) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
}

function hitFrame(x, y) {
  toNdc(x, y);
  const hit = raycaster.intersectObjects(frameMeshes, false)[0];
  return hit ? STOPS.findIndex((s) => s.frame.image === hit.object) : -1;
}

// March along the ray until it dips into the grass.
function hitGround(x, y) {
  toNdc(x, y);
  const o = raycaster.ray.origin, d = raycaster.ray.direction;
  let t = 0.3;
  for (let i = 0; i < 200 && t < 40; i++) {
    tmp.copy(o).addScaledVector(d, t);
    if (tmp.y < heightAt(tmp.x, tmp.z) + 0.25) return tmp;
    t += 0.1 + t * 0.03;
  }
  return null;
}

let lastBuzz = 0;
function brush(x, y, isTouch) {
  if (state !== 'field' || sheetOpen) return;
  const p = hitGround(x, y);
  if (!p) return;
  touch.target.copy(p);
  if (touch.pos.y < -100) touch.pos.copy(p);
  touch.until = performance.now() + 700;
  const now = performance.now();
  if (isTouch && now - lastBuzz > 80 && p.distanceTo(camera.position) < 8) {
    lastBuzz = now;
    try { navigator.vibrate?.(5); } catch { /* not allowed here */ }
  }
}

addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  look.tx = (e.clientX / view.w) * 2 - 1;
  look.ty = (e.clientY / view.h) * 2 - 1;
  if (state !== 'field') return;
  brush(e.clientX, e.clientY, false);
  root.classList.toggle('over-work', !sheetOpen && hitFrame(e.clientX, e.clientY) >= 0);
}, { passive: true });

addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  if (t) brush(t.clientX, t.clientY, true);
}, { passive: true });
addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  if (t) brush(t.clientX, t.clientY, true);
}, { passive: true });

addEventListener('click', (e) => {
  if (state !== 'field' || sheetOpen) return;
  if (e.target.closest('button, a, .label-card, #sheet')) return;
  const i = hitFrame(e.clientX, e.clientY);
  if (i >= 0) openSheet(i);
});

// --- resize -----------------------------------------------------------------

let lastWidth = innerWidth;
function onResize() {
  const widthChanged = innerWidth !== lastWidth;
  lastWidth = innerWidth;
  const scale = stage.style.transform;
  stage.style.transform = '';
  layout();
  stage.style.transform = scale;
  renderer?.setSize(view.w, view.h, false);
  if (posCurve) buildPath();
  if (state === 'field' && widthChanged) {
    const p = pTarget;
    sizeTrail();
    window.scrollTo(0, p * seg);
  }
}
let resizeQueued = false;
addEventListener('resize', () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; onResize(); });
});

// --- per-frame --------------------------------------------------------------

function setFramesOpacity(o) {
  for (const s of STOPS) s.frame.setOpacity(o);
}

function update(dt, now) {
  let k;
  switch (state) {
    case 'boot':
    case 'desktop':
      wallPose();
      holeBounds(1, bCur);
      windTarget = 0.28;
      if (state === 'desktop' && now - lastInput > IDLE_MS) startSaver();
      break;
    case 'saver':
      wallPose();
      holeBounds(1, bCur);
      windTarget = 1;
      if (tState >= T.saver) setState('zoom');
      break;
    case 'zoom': {
      k = easeInOut(clamp(tState / T.zoom, 0, 1));
      const s = Math.pow(sEnd, k);
      setStageScale(s);
      holeBounds(s, bCur);
      wallPose();
      crt.style.opacity = String(clamp(1 - k * 1.6, 0, 1));
      if (tState >= T.zoom) {
        stage.hidden = true;
        setState('dolly');
      }
      break;
    }
    case 'dolly':
      k = clamp(tState / T.dolly, 0, 1);
      dollyPose(easeInOut(k));
      holeBounds(sEnd, bA);
      fieldBounds(bB);
      mixBounds(bA, bB, smooth(clamp(k * 1.25, 0, 1)), bCur);
      setFramesOpacity(smooth(clamp((k - 0.45) / 0.45, 0, 1)));
      windTarget = 0.85;
      if (k >= 1) enterField();
      break;
    case 'field':
      pS += (pTarget - pS) * (1 - Math.exp(-dt * 4.5));
      pathPose(pS);
      fieldBounds(bCur);
      setFramesOpacity(1);
      windTarget = 0.85;
      updateFieldUI();
      break;
    case 'undolly':
      k = easeInOut(clamp(tState / T.undolly, 0, 1));
      pose.pos.lerpVectors(saved.pos, WALL_POS, k);
      pose.look.lerpVectors(saved.look, WALL_LOOK, k);
      holeBounds(sEnd, bA);
      mixBounds(saved.bounds, bA, k, bCur);
      setFramesOpacity(1 - smooth(clamp(k * 2, 0, 1)));
      windTarget = 0.28;
      if (tState >= T.undolly) {
        stage.hidden = false;
        setStageScale(sEnd);
        crt.style.opacity = '0';
        setState('unzoom');
      }
      break;
    case 'unzoom': {
      k = easeInOut(clamp(tState / T.unzoom, 0, 1));
      const s = Math.pow(sEnd, 1 - k);
      setStageScale(s);
      holeBounds(s, bCur);
      wallPose();
      crt.style.opacity = String(clamp((k - 0.4) / 0.6, 0, 1));
      if (tState >= T.unzoom) restoreDesktop();
      break;
    }
  }

  const u = world.uniforms;
  const wind = reduceMotion ? windTarget * 0.3 : windTarget;
  u.uWind.value += (wind - u.uWind.value) * (1 - Math.exp(-dt * 1.5));

  // Grass parting under the cursor or finger.
  const touching = state === 'field' && now < touch.until;
  touch.pos.lerp(touch.target, 1 - Math.exp(-dt * 14));
  touch.amt += ((touching ? 1 : 0) - touch.amt) * (1 - Math.exp(-dt * (touching ? 10 : 3)));
  u.uTouch.value.copy(touch.pos);
  u.uTouchAmt.value = touch.amt;

  keepAboveGround(pose.pos, state === 'field' ? 1.2 : 1.0);
  camera.position.copy(pose.pos);
  camera.lookAt(pose.look);
  if (state === 'field' && !coarse) {
    look.x += (look.tx - look.x) * (1 - Math.exp(-dt * 3));
    look.y += (look.ty - look.y) * (1 - Math.exp(-dt * 3));
    camera.rotateY(-look.x * 0.05);
    camera.rotateX(-look.y * 0.035);
  }
  camera.updateMatrixWorld();
  camera.projectionMatrix.makePerspective(bCur.l, bCur.r, bCur.t, bCur.b, NEAR, FAR);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tState += dt * 1000;
  world.uniforms.uTime.value += dt;
  update(dt, now);
  world.update(camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// --- boot -------------------------------------------------------------------

function fail(message) {
  boot.classList.add('failed');
  $('#boot-fail').textContent = message;
}

async function main() {
  const started = performance.now();
  layout();
  buildTrailMarkers();
  history.scrollRestoration = 'manual';

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    fail('This prototype needs WebGL, and this browser has it switched off.');
    return;
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.setSize(view.w, view.h, false);

  // Give the label font a moment so the placeholder stamps use it.
  await Promise.race([
    document.fonts?.load('700 20px "Courier Prime"') ?? Promise.resolve(),
    new Promise((r) => setTimeout(r, 1200)),
  ]).catch(() => {});

  paintWorks();
  for (const icon of $$('.icon[data-work]', desktop)) {
    $('img', icon).src = WORKS[Number(icon.dataset.work)].thumb;
  }

  for (const s of STOPS) {
    s.frame = makeFrame(s.work, { grounded: s.grounded });
    s.frame.group.position.copy(s.at);
    s.frame.group.lookAt(tmp.copy(s.at).add(s.facing));
    s.frame.setOpacity(0);
    scene.add(s.frame.group);
  }
  frameMeshes = STOPS.map((s) => s.frame.image);

  // Clouds keep clear of the line between each sky stop and its work.
  const clearings = STOPS.filter((s) => !s.grounded).flatMap((s) => [
    { from: s.at, to: s.at.clone().addScaledVector(s.facing.clone().normalize(), 12), radius: 3.5 },
  ]);
  world = buildWorld(scene, { lowPower, clearings });
  buildPath();

  wallPose();
  holeBounds(1, bCur);
  requestAnimationFrame((t) => { last = t; frame(t); });

  const wait = BOOT_MS - (performance.now() - started);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  boot.classList.add('done');
  setTimeout(() => { boot.hidden = true; }, 500);
  lastInput = performance.now();
  setState('desktop');
}

main().catch((err) => {
  console.error(err);
  fail('Something went wrong while building the landscape.');
});

// Hooks for automated checks.
window.__tg = {
  get state() { return state; },
  saver: () => { lastInput = 0; },
  holdIdle: () => { lastInput = performance.now() + 1e9; },
  jump(p) {
    if (state !== 'field') {
      stage.hidden = true;
      desktop.classList.add('saver');
      enterField();
    }
    pTarget = pS = p;
    window.scrollTo(0, p * seg);
  },
  setPhase(s, t) { setState(s); tState = t; },
  openSheet,
};
