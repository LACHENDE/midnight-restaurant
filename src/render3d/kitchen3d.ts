// The cook's kitchen in real 3D (three.js), for 3d.html.
// The game's rules and input stay exactly as they are: they work on the 1000×460 stage (KL points). Every 3D object
// is placed where its stage point lands: a ray from the camera through that point meets the worktop (or the wall) at
// the object's height. So a drag that hits the pot in 2D hits the 3D pot too. The 2D canvas above draws only words
// (tray names, the doneness dial, "sent back"), the hint arrow and the particles.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { G } from '../game/G';
import { K, isEmpty, trayOpen } from '../game/night-state';
import { KL } from '../data/layout';
import { HOOK3D, OX, OY, S, DPR, ctx } from '../render/stage';
import { VW, VH, LIFT } from '../render/dims';
import { PTRS } from '../render/views';
import { bowlTopAt, rr, el } from '../render/shapes';
import { WORDS, known } from '../data/content';
import { T } from '../core/env';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Z0 = 0.9; // the worktop's height (metres; z is up)
let R: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.PerspectiveCamera, glc: HTMLCanvasElement;
let low = /[?&]lo\b/.test(location.search), slow = 0, fpsT = 0, frames = 0;

// ---------- stage point → 3D ----------
const ray = (sx: number, sy: number) => {
  const p = V((sx / VW) * 2 - 1, 1 - (sy / VH) * 2, 0.5).unproject(cam);
  return p.sub(cam.position).normalize();
};
/** where the stage point (sx, sy) meets the level z */
function atZ(sx: number, sy: number, z: number) { const d = ray(sx, sy), t = (z - cam.position.z) / d.z; return cam.position.clone().addScaledVector(d, t); }
/** where the stage point meets the wall plane y */
function atY(sx: number, sy: number, y: number) { const d = ray(sx, sy), t = (y - cam.position.y) / d.y; return cam.position.clone().addScaledVector(d, t); }
/** how wide w stage units are at that point and level */
const span = (sx: number, sy: number, z: number, w: number) => atZ(sx - w / 2, sy, z).distanceTo(atZ(sx + w / 2, sy, z));

// ---------- materials ----------
const M = (c: string, rough = 0.6, metal = 0, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, metalness: metal, ...extra });
const MAT = {
  wood: M('#9C6844', 0.55, 0, { clearcoat: 0.2 }), woodD: M('#4E3020', 0.65), woodL: M('#C99A6C', 0.5, 0, { clearcoat: 0.3 }),
  plank: [M('#6E4A36', 0.7), M('#5F3F2E', 0.7)], steel: M('#D3DADF', 0.22, 0.85), steelD: M('#5B646C', 0.35, 0.7),
  black: M('#202428', 0.5), red: M('#D7432F', 0.55), cream: M('#FFF1DA', 0.5), white: M('#FAF8F3', 0.22, 0, { clearcoat: 0.6 }),
  water: M('#9FD3EA', 0.05, 0, { transmission: 0.2, clearcoat: 1, emissive: '#3A6C80', emissiveIntensity: 0.25 }),
  broth: M('#C27C2E', 0.12, 0, { clearcoat: 1, emissive: '#3A1C06', emissiveIntensity: 0.3 }),
  noodle: M('#F2D27E', 0.5, 0, { sheen: 0.5 }), yolk: M('#F5A623', 0.35, 0, { clearcoat: 0.5 }), negi: M('#6FC24A', 0.4), pink: M('#EE7FA0', 0.5),
  lantern: new THREE.MeshStandardMaterial({ color: '#F2A65A', emissive: '#FF8A30', emissiveIntensity: 0.9 }),
  glow: new THREE.MeshStandardMaterial({ color: '#FFE2A8', emissive: '#FFB45E', emissiveIntensity: 1.6 }),
  night: new THREE.MeshBasicMaterial({ color: '#1A2C5C' }), mat: M('#3A3F44', 0.95), dark: M('#160C07', 0.9),
};
const JARS = ['#E9C79B', '#A7BF8A', '#D96F45', '#F0C27A', '#B48AB3'].map(c => M(c, 0.3, 0, { clearcoat: 0.6 }));
const HYD = ['#5B7BEA', '#8E6AD8', '#4C9BE0'].map(c => M(c, 0.6));

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// the bowl: red stripes around the outside (the stall's bowls), white inside
const stripeTex = canvasTex(256, 16, g => { g.fillStyle = '#FAF8F3'; g.fillRect(0, 0, 256, 16); g.fillStyle = '#D7432F'; for (let i = 0; i < 16; i++) g.fillRect(i * 16 + 4, 0, 8, 16); });
const bowlOut = M('#ffffff', 0.25, 0, { map: stripeTex, clearcoat: 0.6, side: THREE.DoubleSide });
const BOWL_IN = M('#FAF8F3', 0.22, 0, { clearcoat: 0.6, side: THREE.DoubleSide });
// the basket's wire mesh
const meshTex = canvasTex(64, 64, g => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#fff'; g.lineWidth = 3; for (let i = 0; i <= 64; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } });
meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping; meshTex.repeat.set(6, 2);
const wire = new THREE.MeshStandardMaterial({ color: '#C9D2D9', metalness: 0.8, roughness: 0.3, alphaMap: meshTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 });
const softTex = canvasTex(64, 64, g => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const swirlTex = canvasTex(64, 64, g => { g.fillStyle = '#FAF8F3'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#EE7FA0'; g.lineWidth = 5; g.beginPath(); for (let a = 0; a < 12; a += 0.1) { const r = a * 2.4; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.stroke(); });

// ---------- shapes ----------
const add = (o: THREE.Object3D, parent: THREE.Object3D = scene) => { parent.add(o); return o; };
function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; }
const rbox = (w: number, d: number, h: number, mat: THREE.Material, r = 0.03) => mesh(new RoundedBoxGeometry(w, d, h, 3, Math.min(r, w / 2.2, d / 2.2, h / 2.2)), mat);
/** a turned shape (bowl, pot): profile [radius, height] points, open or closed */
function lathe(pts: [number, number][], mat: THREE.Material, seg = 40) {
  const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg); g.rotateX(Math.PI / 2); return mesh(g, mat);
}
const cyl = (r: number, h: number, mat: THREE.Material, seg = 32, top = r) => { const g = new THREE.CylinderGeometry(top, r, h, seg); g.rotateX(Math.PI / 2); return mesh(g, mat); };
const ball = (r: number, mat: THREE.Material, sx = 1, sy = 1, sz = 1) => { const m = mesh(new THREE.SphereGeometry(r, 24, 16), mat); m.scale.set(sx, sy, sz); return m; };
const torus = (R: number, r: number, mat: THREE.Material) => mesh(new THREE.TorusGeometry(R, r, 10, 28), mat);

/** a ramen bowl (radius r): striped outside, white inside, and what's in it */
function makeBowl(r: number) {
  const g = new THREE.Group(), h = r * 0.62;
  const prof: [number, number][] = [[r * 0.42, 0], [r * 0.46, h * 0.08], [r * 0.82, h * 0.55], [r, h], [r * 0.95, h], [r * 0.78, h * 0.55], [r * 0.4, h * 0.12], [0, h * 0.12]];
  const shell = lathe(prof, bowlOut, 48); add(shell, g);
  const inner = lathe([[r * 0.94, h * 0.99], [r * 0.76, h * 0.55], [r * 0.38, h * 0.14], [0, h * 0.14]], BOWL_IN, 40); add(inner, g);
  const soup = mesh(new THREE.CircleGeometry(1, 40), MAT.broth, false); add(soup, g);
  const noodles = new THREE.Group(); add(noodles, g);
  for (let i = 0; i < 7; i++) { const n = torus(r * (0.18 + (i % 3) * 0.06), r * 0.035, MAT.noodle); n.position.set(Math.cos(i * 2.3) * r * 0.22, Math.sin(i * 2.3) * r * 0.22, 0); n.rotation.set(0.3 * Math.sin(i), 0.3 * Math.cos(i), i); add(n, noodles); }
  const tops: Record<string, THREE.Group> = {};
  tops.tamago = new THREE.Group(); add(ball(r * 0.2, MAT.white, 1, 0.8, 0.45), tops.tamago); const y = ball(r * 0.11, MAT.yolk, 1, 0.8, 0.5); y.position.z = r * 0.06; add(y, tops.tamago);
  tops.negi = new THREE.Group(); for (let i = 0; i < 6; i++) { const t = torus(r * 0.05, r * 0.02, MAT.negi); t.position.set(Math.cos(i) * r * 0.1, Math.sin(i * 1.7) * r * 0.1, 0); add(t, tops.negi); }
  tops.naruto = new THREE.Group(); const nd = cyl(r * 0.16, r * 0.05, M('#ffffff', 0.4, 0, { map: swirlTex })); add(nd, tops.naruto);
  for (const k in tops) add(tops[k], g);
  return { g, r, h, soup, noodles, tops };
}
type Bowl3 = ReturnType<typeof makeBowl>;
const NOODLE_COL: Record<string, string> = { raw: '#F7E6B0', ready: '#F2D27E', soft: '#E6BE62', soggy: '#C9A24E' };
/** show bowl state b (noodles, broth level, toppings) on a 3D bowl; the toppings sit where the 2D game expects them */
function fillBowl(B: Bowl3, b: any, sx: number, sy: number) {
  const lvl = Math.min(1.1, b.broth || 0);
  B.soup.visible = lvl > 0.02 || !!b.noodles;
  const z = B.h * (0.18 + 0.7 * Math.min(1, lvl || 0.35)); B.soup.position.z = z;
  const rr_ = B.r * (0.42 + 0.5 * Math.min(1, z / B.h)); B.soup.scale.set(rr_, rr_, 1);
  (B.soup.material as THREE.MeshPhysicalMaterial) = lvl > 0.02 ? MAT.broth : MAT.white;
  B.noodles.visible = !!b.noodles; B.noodles.position.z = z + B.r * 0.02;
  if (b.noodles) B.noodles.children.forEach(n => ((n as THREE.Mesh).material as THREE.MeshPhysicalMaterial).color.set(NOODLE_COL[b.noodles] || '#F2D27E'));
  for (const w in B.tops) {
    const on = (b.tops || []).includes(w); B.tops[w].visible = on;
    if (on) { const p = bowlTopAt(sx, sy, 1, w), q = atZ(p.x, p.y, B.g.position.z + z), loc = B.g.worldToLocal(q.clone()); B.tops[w].position.set(loc.x, loc.y, z + B.r * 0.05); }
  }
}

// ---------- the set ----------
let pot: THREE.Group, potWater: THREE.Mesh, potTop = 0, basket: THREE.Group, basketFull: THREE.Group, hookAt = V(), potAt = V();
let ladle: THREE.Group, ladleAt = V(), stream: THREE.Mesh, slotBowls: Bowl3[] = [], slotAt: THREE.Vector3[] = [], slotR = 0.2;
let held: Record<string, THREE.Object3D> = {}, heldBowl: Bowl3, backBowls: Bowl3[] = [], slidBowls: Bowl3[] = [];
const trayGroups: Record<string, { g: THREE.Group; lid: THREE.Mesh; food: THREE.Group }> = {};
const bubbles: THREE.Mesh[] = [], steam: THREE.Sprite[] = [], rain: THREE.LineSegments[] = [];
let lanternLight: THREE.PointLight, burnerLight: THREE.PointLight;

function build() {
  scene = new THREE.Scene(); scene.background = new THREE.Color('#1A2340');
  cam = new THREE.PerspectiveCamera(30, VW / VH, 0.1, 80); cam.up.set(0, 0, 1);
  cam.position.set(0, -3.75, 3.25); cam.lookAt(0, 0.6, 0.86); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;

  // where things are: the wall stands behind the worktop's back edge (stage y 214)
  const back = atZ(500, 214, Z0), front = atZ(500, 470, Z0), wallY = back.y + 0.02;
  // worktop, its steel top, the cabinet front
  const left = atZ(-40, 470, Z0).x - 0.3, right = atZ(1040, 470, Z0).x + 0.3, wd = right - left;
  const top = rbox(wd, wallY - front.y + 0.1, 0.06, MAT.steel, 0.02); top.position.set((left + right) / 2, (wallY + front.y) / 2 - 0.05, Z0 - 0.03); add(top);
  const cab = rbox(wd, 0.2, Z0 - 0.06, MAT.wood, 0.03); cab.position.set((left + right) / 2, front.y - 0.02, (Z0 - 0.06) / 2); add(cab);
  for (let i = 0; i < 8; i++) { const d = rbox(wd / 8 - 0.06, 0.03, Z0 * 0.7, MAT.woodD, 0.02); d.position.set(left + (i + 0.5) * (wd / 8), front.y - 0.13, Z0 * 0.42); add(d); }
  // the back wall of planks, the noren along the top
  const wTop = atY(500, -30, wallY).z, wBot = Z0 - 0.05;
  for (let x = left, i = 0; x < right; x += 0.24, i++) { const p = rbox(0.23, 0.08, wTop - wBot + 0.4, MAT.plank[i % 2], 0.01); p.position.set(x + 0.12, wallY + 0.05, (wTop + wBot) / 2 + 0.2); add(p); }
  const nz = atY(500, 22, wallY - 0.35).z;
  for (let i = 0; i < 6; i++) { const n = rbox(wd / 6 - 0.04, 0.03, 0.34, MAT.red, 0.015); n.position.set(left + (i + 0.5) * (wd / 6), wallY - 0.35, nz); add(n); }
  // a shelf of jars over the stove
  const sh = atY(560, 128, wallY - 0.1); const shelf = rbox(1.7, 0.24, 0.05, MAT.woodL, 0.02); shelf.position.set(sh.x, wallY - 0.12, sh.z); add(shelf);
  for (let i = 0; i < 5; i++) { const j = rbox(0.24, 0.2, 0.28, JARS[i], 0.06); j.position.set(sh.x - 0.64 + i * 0.32, wallY - 0.12, sh.z + 0.17); add(j); const l = rbox(0.25, 0.21, 0.05, MAT.woodD, 0.02); l.position.set(j.position.x, j.position.y, sh.z + 0.33); add(l); }
  // the window onto the rainy street (stage 718..976 × 54..244)
  const w0 = atY(718, 244, wallY - 0.02), w1 = atY(976, 54, wallY - 0.02), ww = w1.x - w0.x, wh = w1.z - w0.z;
  const fr = rbox(ww + 0.14, 0.12, wh + 0.14, MAT.woodD, 0.03); fr.position.set((w0.x + w1.x) / 2, wallY - 0.03, (w0.z + w1.z) / 2); add(fr);
  const view = mesh(new THREE.PlaneGeometry(ww, wh), MAT.night, false); view.rotation.x = Math.PI / 2; view.position.set(fr.position.x, wallY - 0.1, fr.position.z); add(view);
  for (let k = 0; k < 5; k++) { const h = ball(0.09 + (k % 2) * 0.03, HYD[k % 3]); h.position.set(w0.x + 0.15 + k * (ww - 0.3) / 4, wallY - 0.12, w0.z + 0.1); add(h); }
  for (const [fx, fz] of [[0.3, 0.55], [0.7, 0.4]]) { const l = rbox(0.12, 0.02, 0.16, MAT.glow, 0.01); l.position.set(w0.x + ww * fx, wallY - 0.11, w0.z + wh * fz); add(l); }
  const bar1 = rbox(0.05, 0.05, wh, MAT.woodD, 0.01); bar1.position.set(fr.position.x, wallY - 0.14, fr.position.z); add(bar1);
  const bar2 = rbox(ww, 0.05, 0.05, MAT.woodD, 0.01); bar2.position.set(fr.position.x, wallY - 0.14, fr.position.z); add(bar2);
  for (let i = 0; i < 3; i++) {
    const pos: number[] = []; for (let k = 0; k < 40; k++) { const x = w0.x + Math.random() * ww, z = w0.z + Math.random() * wh; pos.push(x, wallY - 0.13, z, x - 0.01, wallY - 0.13, z - 0.12); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const r = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#9CC3FF', transparent: true, opacity: 0.45 })); r.userData = { z0: w0.z, h: wh }; rain.push(r); add(r);
  }
  // the paper lantern at the top left
  const la = atY(64, 92, wallY - 0.3);
  const lan = ball(0.2, MAT.lantern, 1, 1, 1.2); lan.castShadow = false; lan.position.copy(la); add(lan);
  for (const dz of [0.25, -0.25]) { const c = cyl(0.13, 0.05, MAT.black); c.position.set(la.x, la.y, la.z + dz); add(c); }
  lanternLight = new THREE.PointLight('#FFA14A', 3.2, 6, 1.6); lanternLight.position.set(la.x, la.y - 0.2, la.z); add(lanternLight);

  // the hook and the noodle basket
  hookAt = atY(KL.hook.x, KL.hook.y, wallY - 0.16);
  const hk = rbox(0.6, 0.06, 0.05, MAT.woodD, 0.01); hk.position.set(hookAt.x + 0.1, wallY - 0.02, hookAt.z + 0.24); add(hk);
  basket = makeBasket(span(KL.hook.x, KL.hook.y, Z0, 64) / 2); add(basket);
  basketFull = basket.userData.noodles;
  // the stock pot (its water surface at the pot point) on a burner
  const pr = span(KL.pot.x, KL.pot.y, Z0 + 0.18, 200) / 2; potTop = Z0 + 0.2; potAt = atZ(KL.pot.x, KL.pot.y, potTop);
  pot = new THREE.Group(); pot.position.set(potAt.x, potAt.y, Z0);
  add(lathe([[pr * 0.92, 0], [pr, 0.02], [pr, 0.2], [pr * 1.04, 0.21], [pr * 0.97, 0.21], [pr * 0.95, 0.03], [0, 0.03]], MAT.steel, 56), pot);
  for (const s of [-1, 1]) { const h = rbox(0.16, 0.06, 0.05, MAT.black, 0.02); h.position.set(s * (pr + 0.06), 0, 0.15); add(h, pot); }
  potWater = mesh(new THREE.CircleGeometry(pr * 0.95, 48), MAT.water, false); potWater.position.z = 0.18; add(potWater, pot);
  const burner = cyl(pr * 1.06, 0.05, MAT.black); burner.position.set(potAt.x, potAt.y, Z0 + 0.02); add(burner);
  burnerLight = new THREE.PointLight('#FF7A30', 1.2, 1.4, 2); burnerLight.position.set(potAt.x, potAt.y - pr - 0.05, Z0 + 0.05); add(burnerLight);
  add(pot);
  for (let i = 0; i < 16; i++) { const b = ball(0.012 + Math.random() * 0.012, MAT.white); b.castShadow = false; b.userData = { a: i * 2.39, r: ((i * 0.37) % 1) * pr * 0.8, ph: Math.random() }; add(b, pot); bubbles.push(b); }
  // the broth pot and the ladle
  const brr = span(KL.broth.x, KL.broth.y, Z0 + 0.22, 104) / 2, ba = atZ(KL.broth.x, KL.broth.y, Z0 + 0.24);
  const bp = new THREE.Group(); bp.position.set(ba.x, ba.y, Z0);
  add(lathe([[brr * 0.92, 0], [brr, 0.02], [brr, 0.24], [brr * 1.04, 0.25], [brr * 0.97, 0.25], [brr * 0.95, 0.03], [0, 0.03]], MAT.steel, 48), bp);
  const bs = mesh(new THREE.CircleGeometry(brr * 0.95, 40), MAT.broth, false); bs.position.z = 0.22; add(bs, bp); add(bp);
  const bb = cyl(brr * 1.06, 0.05, MAT.black); bb.position.set(ba.x, ba.y, Z0 + 0.02); add(bb);
  ladleAt = atZ(KL.ladle.x - 20, KL.ladle.y + 10, Z0 + 0.3);
  ladle = makeLadle(); add(ladle);
  stream = cyl(0.012, 1, MAT.broth, 10); stream.visible = false; add(stream);
  // the noodle box with three nests
  const bx = atZ(KL.box.x, KL.box.y, Z0 + 0.06), bw = span(KL.box.x, KL.box.y, Z0, 150);
  const box = rbox(bw, 0.36, 0.1, MAT.woodL, 0.02); box.position.set(bx.x, bx.y, Z0 + 0.05); add(box);
  for (let i = 0; i < 3; i++) { const n = nest(bw * 0.13); n.position.set(bx.x - bw * 0.3 + i * bw * 0.3, bx.y, Z0 + 0.12); add(n); }
  // the topping trays
  for (const w of Object.keys(KL.trays)) {
    const t = KL.trays[w], c = atZ(t.x, t.y - 4, Z0 + 0.03), tw = span(t.x, t.y, Z0, 112);
    const g = new THREE.Group(); g.position.copy(c);
    add(rbox(tw, tw * 0.5, 0.05, MAT.steel, 0.02), g);
    const food = new THREE.Group(); add(food, g);
    for (let k = 0; k < 3; k++) { const f = topping(w, tw * 0.16); f.position.set((k - 1) * tw * 0.28, (k % 2 ? 0.03 : -0.03), 0.05); add(f, food); }
    const lid = rbox(tw * 0.96, tw * 0.46, 0.03, MAT.woodD, 0.02); lid.position.z = 0.05; add(lid, g);
    trayGroups[w] = { g, lid, food }; add(g);
  }
  // the bowl slots, the scrap tub, the pass hatch
  slotR = span(KL.slots[0].x, KL.slots[0].y, Z0 + 0.12, 112) / 2;
  KL.slots.forEach((s, i) => { const a = atZ(s.x, s.y, Z0 + slotR * 0.62); slotAt[i] = V(a.x, a.y, Z0); const B = makeBowl(slotR); B.g.position.copy(slotAt[i]); add(B.g); slotBowls.push(B); });
  const sc_ = atZ(KL.scrap.x, KL.scrap.y, Z0 + 0.05); const tub = lathe([[0.08, 0], [0.11, 0.05], [0.105, 0.05], [0.075, 0.008], [0, 0.008]], MAT.steelD, 32); tub.position.set(sc_.x, sc_.y, Z0); add(tub);
  const p0 = atZ(830, 420, Z0), p1 = atZ(1000, 200, Z0);
  const hatch = rbox(p1.x - p0.x + 0.3, 0.6, 1.0, MAT.woodD, 0.04); hatch.position.set((p0.x + p1.x) / 2 + 0.1, wallY - 0.2, Z0 + 0.5); add(hatch);
  const hole = rbox(p1.x - p0.x, 0.1, 0.62, MAT.dark, 0.02); hole.position.set(hatch.position.x - 0.05, wallY - 0.5, Z0 + 0.36); add(hole);
  const sign = rbox(p1.x - p0.x, 0.05, 0.16, MAT.red, 0.02); sign.position.set(hole.position.x, wallY - 0.52, Z0 + 0.8); add(sign);
  for (let j = 0; j < 3; j++) { const B = makeBowl(slotR * 0.72); B.g.visible = false; add(B.g); backBowls.push(B); }
  for (let j = 0; j < 3; j++) { const B = makeBowl(slotR); B.g.visible = false; add(B.g); slidBowls.push(B); }
  heldBowl = makeBowl(slotR); heldBowl.g.visible = false; add(heldBowl.g);
  // held things: a nest, a topping each
  held.nest = nest(span(KL.box.x, KL.box.y, Z0, 32) / 2); add(held.nest);
  for (const w of Object.keys(KL.trays)) { held[w] = topping(w, span(300, 300, Z0, 40) / 2); add(held[w]); }
  for (const k in held) held[k].visible = false;
  // steam puffs
  for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, transparent: true, opacity: 0, depthWrite: false })); s.userData = { life: 9 }; add(s); steam.push(s); }

  // light: warm key from the front left, cool rim through the window, the lantern, a little warm fill
  scene.add(new THREE.HemisphereLight('#FFE3C4', '#3A2A40', 0.6));
  const key = new THREE.DirectionalLight('#FFE0BC', 2.2); key.position.set(-2.5, -4, 6); key.target.position.set(0, 0.4, Z0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  const sc = key.shadow.camera as THREE.OrthographicCamera; sc.left = -4; sc.right = 4; sc.top = 3; sc.bottom = -3; sc.near = 0.5; sc.far = 15;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#7FA8FF', 0.8); rim.position.set(3, 4, 4); scene.add(rim);
  const fill = new THREE.PointLight('#FFB27A', 2.5, 7, 1.5); fill.position.set(2.5, -2, 2); scene.add(fill);
}
function makeBasket(r: number) {
  const g = new THREE.Group(), h = r * 1.1;
  const cage = mesh(new THREE.CylinderGeometry(r, r * 0.9, h, 24, 1, true), wire); cage.rotation.x = Math.PI / 2; cage.position.z = -h / 2; add(cage, g);
  const bottom = mesh(new THREE.CircleGeometry(r * 0.9, 24), wire); bottom.position.z = -h; add(bottom, g);
  const rim = torus(r, 0.008, MAT.steel); add(rim, g);
  const handle = cyl(0.018, 0.5, MAT.woodD, 10); handle.rotation.set(0, Math.PI / 2 - 0.5, 0); handle.position.set(r + 0.2, 0, 0.12); add(handle, g);
  const noodles = new THREE.Group(); for (let i = 0; i < 6; i++) { const n = torus(r * (0.3 + (i % 3) * 0.12), r * 0.07, MAT.noodle); n.position.z = -h * 0.55 + (i % 3) * 0.02; n.rotation.z = i; add(n, noodles); } add(noodles, g);
  g.userData.noodles = noodles; g.userData.h = h; return g;
}
function makeLadle() {
  const g = new THREE.Group();
  const cup = lathe([[0, 0], [0.05, 0.005], [0.075, 0.04], [0.072, 0.042], [0.045, 0.01], [0, 0.008]], MAT.steel, 24); add(cup, g);
  const h = cyl(0.012, 0.6, MAT.steel, 8); h.rotation.set(0.5, 0, 0); h.position.set(0, 0.14, 0.27); add(h, g);
  return g;
}
function nest(r: number) { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const t = torus(r * (0.5 + i * 0.15), r * 0.18, MAT.noodle); t.rotation.z = i; t.position.z = i * 0.006; add(t, g); } return g; }
function topping(w: string, r: number) {
  const g = new THREE.Group();
  if (w === 'tamago') { add(ball(r, MAT.white, 1, 0.8, 0.5), g); const y = ball(r * 0.55, MAT.yolk, 1, 0.8, 0.5); y.position.z = r * 0.3; add(y, g); }
  else if (w === 'negi') { for (let i = 0; i < 5; i++) { const t = torus(r * 0.3, r * 0.12, MAT.negi); t.position.set(Math.cos(i * 1.3) * r * 0.5, Math.sin(i * 2.1) * r * 0.5, 0.01); add(t, g); } }
  else { const d = cyl(r, r * 0.3, M('#ffffff', 0.4, 0, { map: swirlTex })); add(d, g); }
  return g;
}

// ---------- every frame ----------
const dragOf = (k: string) => { for (const it of PTRS.values()) if ((it as any).kind === k) return it as any; return null; };
const heldAt = (it: any) => atZ(it.x, it.y - LIFT, Z0 + 0.4);
let puffT = 0;
function puff(at: THREE.Vector3, size = 0.18) { const s = steam.find(s => s.userData.life >= 1.6); if (!s) return; s.position.copy(at); s.userData = { life: 0, size, vx: (Math.random() - 0.5) * 0.05 }; }
function sync(dt: number) {
  const t = G.clock, b = K.basket, db = dragOf('basket');
  // the pot: bubbles, the basket swaying in it, the burner's flicker
  bubbles.forEach(m => { const u = m.userData, ph = (t * 1.8 + u.ph) % 1; m.position.set(Math.cos(u.a) * u.r, Math.sin(u.a) * u.r, 0.18 + ph * 0.012); m.scale.setScalar(0.5 + ph); });
  burnerLight.intensity = 1.1 + Math.sin(t * 13) * 0.15 + Math.sin(t * 7.3) * 0.1;
  lanternLight.intensity = 3.1 + Math.sin(t * 2.1) * 0.15;
  // the basket: on its hook, down in the pot, or in your hand
  const bh = basket.userData.h;
  if (db) { const p = heldAt(db); basket.position.set(p.x, p.y, p.z); basket.rotation.set(0.2, 0, Math.sin(t * 6) * 0.05); }
  else if (b.st === 'pot') { basket.position.set(potAt.x - 0.05, potAt.y, potTop + bh * 0.35 + Math.sin(t * 3) * 0.008); basket.rotation.set(0, 0, 0.2); }
  else { basket.position.set(hookAt.x, hookAt.y, hookAt.z + Math.sin(t * 1.3) * 0.004); basket.rotation.set(0, 0, 0); }
  basketFull.visible = !!(b.st === 'full' || b.st === 'pot' || (db && db.from === 'pot'));
  basketFull.children.forEach(n => ((n as THREE.Mesh).material as THREE.MeshPhysicalMaterial).color.set(NOODLE_COL[b.done] || '#F2D27E'));
  if (db && db.from === 'pot' && Math.random() < dt * 10) puff(V(basket.position.x, basket.position.y, basket.position.z - 0.1), 0.1);
  // the ladle, pouring a stream of broth into the bowl it's over
  const dl = dragOf('ladle');
  if (dl) { const p = heldAt(dl); ladle.position.copy(p); ladle.rotation.set(dl.over != null ? -0.9 : -0.2, 0, 0); }
  else { ladle.position.copy(ladleAt); ladle.rotation.set(-0.15, 0, 0.4); }
  stream.visible = !!(dl && dl.over != null);
  if (stream.visible) { const a = ladle.position.clone().add(V(0, -0.05, -0.02)), bz = slotAt[dl.over].clone().add(V(0, 0, slotR * 0.4)), len = a.distanceTo(bz); stream.position.copy(a.clone().lerp(bz, 0.5)); stream.scale.set(1, 1, len); stream.lookAt(bz); }
  // the trays: open ones show their food; locked ones have a lid
  for (const w in trayGroups) { const o = !!trayOpen(w); trayGroups[w].lid.visible = !o; trayGroups[w].food.visible = o; }
  // the bowls in their slots (the one in your hand follows the finger)
  const dbw = dragOf('bowl');
  slotBowls.forEach((B, i) => {
    const bw = K.slots[i], show = !!bw && !(dbw && dbw.i === i);
    B.g.visible = show; if (!show) return;
    const s = 1 + (bw.pop || 0) * 0.12; B.g.scale.set(s, s, 1 + (bw.pop || 0) * -0.08 + (bw.pop || 0) * 0.2 * Math.sin((1 - bw.pop) * 9));
    B.g.position.copy(slotAt[i]); fillBowl(B, bw, KL.slots[i].x, KL.slots[i].y);
    if (bw.broth > 0.3 && Math.random() < dt * 1.6) puff(V(slotAt[i].x, slotAt[i].y, Z0 + slotR * 0.8), 0.12);
  });
  heldBowl.g.visible = false;
  const db2 = dbw ? K.slots[dbw.i] : null, dback = dragOf('back');
  if (dbw && db2) { heldBowl.g.visible = true; const p = heldAt(dbw); heldBowl.g.position.set(p.x, p.y, p.z - 0.1); heldBowl.g.scale.setScalar(1); fillBowl(heldBowl, db2, dbw.x, dbw.y - LIFT); }
  else if (dback && K.back[dback.back]) { heldBowl.g.visible = true; const p = heldAt(dback); heldBowl.g.position.set(p.x, p.y, p.z - 0.1); heldBowl.g.scale.setScalar(0.9); fillBowl(heldBowl, K.back[dback.back], dback.x, dback.y - LIFT); }
  // bowls sent back, waiting at the pass; bowls sliding out through it
  backBowls.forEach((B, j) => {
    const r = K.back[j], show = !!r && !(dback && dback.back === j); B.g.visible = show; if (!show) return;
    const x = KL.pass.x - 30 + j * 60, y = KL.pass.y + 8, a = atZ(x, y, Z0 + slotR * 0.45); B.g.position.set(a.x, a.y, Z0); fillBowl(B, r, x, y);
  });
  slidBowls.forEach((B, j) => {
    const s = K.slid[j]; B.g.visible = !!s; if (!s) return;
    const k = s.t / 0.45, x = s.x + (KL.pass.x + 120 - s.x) * k * k, y = s.y + (KL.pass.y + 8 - s.y) * k, a = atZ(x, y, Z0 + slotR * 0.62);
    B.g.position.set(a.x, a.y, Z0); B.g.scale.setScalar(1 - 0.4 * k); fillBowl(B, s.bowl, x, y);
  });
  // a nest or a topping in your hand
  for (const k in held) held[k].visible = false;
  for (const it of PTRS.values() as any) {
    const p = heldAt(it);
    if (it.kind === 'nest') { held.nest.visible = true; held.nest.position.copy(p); }
    if ((it.kind === 'top' || it.kind === 'untop') && held[it.w]) { held[it.w].visible = true; held[it.w].position.copy(p); held[it.w].rotation.z = Math.sin(t * 5) * 0.2; }
  }
  // steam from the pot and the broth, rising and fading
  puffT -= dt; if (puffT <= 0) { puffT = 0.12; puff(V(potAt.x + (Math.random() - 0.5) * 0.4, potAt.y + (Math.random() - 0.5) * 0.2, potTop + 0.02), 0.22); }
  for (const s of steam) {
    const u = s.userData; if (u.life >= 1.6) { (s.material as THREE.SpriteMaterial).opacity = 0; continue; }
    u.life += dt; s.position.z += dt * 0.32; s.position.x += u.vx * dt;
    const k = u.life / 1.6; s.scale.setScalar(u.size * (1 + k * 1.6)); (s.material as THREE.SpriteMaterial).opacity = 0.42 * Math.sin(Math.PI * k);
  }
  // rain beyond the window
  rain.forEach((r, i) => { r.position.z = -((t * 1.6 + i / 3) % 1) * 0.3; });
}

// ---------- the words over the 3D (2D canvas, stage units) ----------
function words() {
  const g = ctx, b = K.basket, db = dragOf('basket');
  g.textAlign = 'center';
  // the doneness dial above the pot
  if (b.st === 'pot' || (db && db.from === 'pot')) {
    const D = KL.dial, tt = Math.min(b.t, 18);
    rr(g, D.x - 90, D.y - 12, 180, 24, 12); g.fillStyle = 'rgba(255,244,226,.95)'; g.fill();
    ([[0, 3.5, '#C9CFD4'], [3.5, 12, '#5ED3B0'], [12, 16, '#F0B04E'], [16, 18, '#E06A4E']] as [number, number, string][]).forEach(([a, c, col]) => { g.fillStyle = col; rr(g, D.x - 78 + (a / 18) * 156, D.y - 5, ((c - a) / 18) * 156, 10, 4); g.fill(); });
    const px = D.x - 78 + (tt / 18) * 156; g.fillStyle = '#3B2618'; g.beginPath(); g.moveTo(px - 7, D.y - 16); g.lineTo(px + 7, D.y - 16); g.lineTo(px, D.y - 5); g.closePath(); g.fill();
    g.font = '900 11px "M PLUS Rounded 1c"'; g.fillText({ raw: T('not yet', '还没好'), ready: T('ready!', '好了！'), soft: T('soft', '软了'), soggy: T('soggy', '烂了') }[b.done], D.x, D.y + 28);
  }
  // each tray's word: kana always, romaji until you know it, NEW on a new one
  for (const w of Object.keys(KL.trays)) {
    const t = KL.trays[w], open = trayOpen(w);
    rr(g, t.x - 40, t.y + 14, 80, open ? (known(w) ? 22 : 32) : 22, 7); g.fillStyle = open ? '#FFF4E2' : 'rgba(255,244,226,.45)'; g.fill();
    g.fillStyle = '#3B2618'; g.font = '900 15px "M PLUS Rounded 1c"'; g.fillText(open ? WORDS[w].k : '…', t.x, t.y + 31);
    if (open && !known(w)) { g.font = '800 10px "M PLUS Rounded 1c"'; g.fillStyle = '#8A6E57'; g.fillText(WORDS[w].ro, t.x, t.y + 43); }
    if (open && K.trays[w] && !K.shown[w]) { g.fillStyle = '#5ED3B0'; rr(g, t.x + 28, t.y - 38, 34, 16, 8); g.fill(); g.fillStyle = '#0E3B2E'; g.font = '900 10px "M PLUS Rounded 1c"'; g.fillText('NEW', t.x + 45, t.y - 26); }
  }
  // where a drag can go: dashed rings on bowls that want it, the pass when you carry a bowl
  const want = (bw: any) => (db && db.from === 'pot' && !bw.noodles) || dragOf('ladle') || (dragOf('top') && !bw.tops.includes(dragOf('top').w)) || (dragOf('back') && isEmpty(bw));
  g.strokeStyle = 'rgba(94,211,176,.95)'; g.lineWidth = 3; g.setLineDash([7, 6]);
  K.slots.forEach((bw, i) => { if (bw && want(bw)) { const s = KL.slots[i]; el(g, s.x, s.y + 4, 70, 28); g.stroke(); } });
  if (dragOf('bowl')) { rr(g, 830, 210, 160, 190, 12); g.stroke(); }
  g.setLineDash([]);
  K.slots.forEach((bw, i) => { if (bw?.why) { const s = KL.slots[i]; g.fillStyle = '#D8452F'; rr(g, s.x - 34, s.y - 64, 68, 18, 9); g.fill(); g.fillStyle = '#FFF4E2'; g.font = '900 10px "M PLUS Rounded 1c"'; g.fillText(T('sent back', '被退回'), s.x, s.y - 51); } });
  K.back.forEach((r, j) => { const x = KL.pass.x - 30 + j * 60, y = KL.pass.y + 8; g.fillStyle = '#D8452F'; rr(g, x - 30, y - 52, 60, 16, 8); g.fill(); g.fillStyle = '#FFF4E2'; g.font = '900 9.5px "M PLUS Rounded 1c"'; g.fillText(T('sent back', '被退回'), x, y - 41); });
}

// ---------- the renderer ----------
function size() {
  const w = innerWidth, h = innerHeight;
  R.setPixelRatio(low ? 1 : Math.min(2, DPR)); R.setSize(w, h, false);
}
function render(dt: number) {
  glc.hidden = false;
  sync(dt);
  const w = innerWidth, h = innerHeight, vw = VW * S, vh = VH * S;
  R.setScissorTest(false); R.setClearColor('#1A2340'); R.clear();
  R.setViewport(OX, h - OY - vh, vw, vh); R.setScissor(OX, h - OY - vh, vw, vh); R.setScissorTest(true);
  R.render(scene, cam);
  words();
  // a phone that can't keep up gets fewer pixels and no shadows
  fpsT += dt; frames++; if (dt > 0.024) slow += dt;
  if (fpsT > 2.5) { if (!low && slow / fpsT > 0.35) { low = true; R.shadowMap.enabled = false; scene.traverse(o => { if ((o as THREE.Mesh).material) ((o as THREE.Mesh).material as THREE.Material).needsUpdate = true; }); size(); } fpsT = 0; slow = 0; frames = 0; }
  void w;
}
export function initKitchen3D() {
  glc = document.getElementById('gl') as HTMLCanvasElement;
  R = new THREE.WebGLRenderer({ canvas: glc, antialias: true, powerPreference: 'high-performance' });
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  R.shadowMap.enabled = !low; R.shadowMap.type = THREE.PCFSoftShadowMap; R.autoClear = false;
  size(); addEventListener('resize', size);
  build();
  HOOK3D.kitchen = render;
  HOOK3D.off = () => { glc.hidden = true; };
  (window as any).__k3d = { scene, cam, atZ, low: () => low, R };
}
