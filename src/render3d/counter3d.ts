// The counter in real 3D (3d.html): the stall from the guests' side of the counter, the rainy street behind, the guests
// as the owner's drawings (with Ken's clips) on cards standing in the stall, the pass from the kitchen, cups, bowls, coins.
// Like the kitchen, every object stands where its stage point projects, so the 2D taps and drags hit it unchanged.
import * as THREE from 'three';
import { G } from '../game/G';
import { C } from '../game/night-state';
import { CL } from '../data/layout';
import { HOOK3D, ctx } from '../render/stage';
import { VW, VH, LIFT } from '../render/dims';
import { PTRS, CUPY, cupX, bubble } from '../render/views';
import { face, rr, el } from '../render/shapes';
import { LOOKS, NIGHTS } from '../data/content';
import { T, TAU, clamp } from '../core/env';
import { freeSeat, judge } from '../game/counter';
import { M, MAT, mesh, rbox, lathe, cyl, ball, torus, makeBowl, fillBowl, canvasTex, softTex, drawScene, SCENES, add, type Bowl3 } from './kitchen3d';
import { drawGuest } from '../render/shapes';
import { kenOn, kenClip, kenLen, kenLeave, KSP } from '../render/stage';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Z0 = 0.9;
let scene: THREE.Scene, cam: THREE.PerspectiveCamera;
const ray = (sx: number, sy: number) => V((sx / VW) * 2 - 1, 1 - (sy / VH) * 2, 0.5).unproject(cam).sub(cam.position).normalize();
const atZ = (sx: number, sy: number, z: number) => { const d = ray(sx, sy); return cam.position.clone().addScaledVector(d, (z - cam.position.z) / d.z); };
const atY = (sx: number, sy: number, y: number) => { const d = ray(sx, sy); return cam.position.clone().addScaledVector(d, (y - cam.position.y) / d.y); };
const span = (sx: number, sy: number, z: number, w: number) => atZ(sx - w / 2, sy, z).distanceTo(atZ(sx + w / 2, sy, z));

const CM = {
  tea: M('#9DB35A', 0.1, 0, { clearcoat: 1 }), gold: M('#E9B83A', 0.25, 0.85), goldD: M('#C99A2E', 0.3, 0.8), cloth: M('#FDFBF6', 0.9), blue: M('#3E6EA8', 0.6),
  stain: new THREE.MeshBasicMaterial({ color: '#966028', transparent: true, opacity: 0.5, depthWrite: false }),
  house: M('#2A2F45', 0.8), roof: M('#1E2438', 0.6), road: M('#1B2238', 0.08, 0.2, { clearcoat: 1 }),
  umb: ['#E36A5A', '#6C8BE0', '#F2C94C', '#7FBF8F'].map(c => M(c, 0.5, 0, { side: THREE.DoubleSide })),
  hyd: ['#5B7BEA', '#8E6AD8', '#4C9BE0'].map(c => M(c, 0.6)), leaf: M('#3F7F3A', 0.5), cream: M('#FFF1DA', 0.5),
};
const teapotTex = canvasTex(128, 32, g => { g.fillStyle = '#FAF8F3'; g.fillRect(0, 0, 128, 32); g.strokeStyle = '#2E5BB8'; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = 0; x <= 128; x += 4) g.lineTo(x, 10 + k * 7 + Math.sin(x / 8) * 2.5); g.stroke(); } });
const signTex = canvasTex(64, 256, g => { g.fillStyle = '#C8332A'; g.fillRect(0, 0, 64, 256); g.fillStyle = '#FFF4E2'; g.font = '900 44px "M PLUS Rounded 1c", sans-serif'; g.textAlign = 'center'; ['ラ', 'ー', 'メ', 'ン'].forEach((c, i) => g.fillText(c, 32, 50 + i * 58)); });

// ---------- the guests: the owner's drawings (and Ken's clips), drawn by the game onto cards standing in the stall ----------
// A card faces the camera at the guest's depth, sized so the drawing lands exactly where the 2D game would put it;
// the counter in front hides the lower half, as in 2D. Cards redraw about 20 times a second.
interface Card { cv: HTMLCanvasElement; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; m: THREE.Mesh; mat: THREE.MeshBasicMaterial; W: number; H: number; due: number }
const PX = 1.5; // canvas pixels per stage unit
function makeCard(W: number, H: number): Card {
  const cv = document.createElement('canvas'); cv.width = Math.round(W * PX); cv.height = Math.round(H * PX);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = litCard(tex);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.visible = false; scene.add(m);
  return { cv, g: cv.getContext('2d')!, tex, m, mat, W, H, due: 0 };
}
/** A drawing that the stall's lights shade as if it were round: the normal is worked out on the graphics card from the
 * picture itself, every frame (so animated clips work): blurred outlines (the picture's alpha at a few mip levels) make a
 * soft pillow shape, the picture's light and dark add the folds. A little of the picture's own colour always shows. */
export const CARD_LIGHT = { bump: 10.0, detail: 0.04, key: 0.6, warm: 0.8, cool: 0.65 };
function litCard(tex: THREE.Texture) {
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02 });
  mat.onBeforeCompile = sh => {
    for (const k of ['bump', 'detail', 'key', 'warm', 'cool'] as const) sh.uniforms[k] = { value: CARD_LIGHT[k] };
    sh.fragmentShader = sh.fragmentShader.replace('uniform float opacity;', 'uniform float opacity;\nuniform float bump, detail, key, warm, cool;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec2 ts = 1.0 / vec2(textureSize(map, 0));
        #define LUM(c) dot(c, vec3(0.3, 0.59, 0.11))
        #define HH(o) (0.2 * textureLod(map, vMapUv + (o), 3.0).a + 0.35 * textureLod(map, vMapUv + (o), 5.0).a + 0.45 * textureLod(map, vMapUv + (o), 6.5).a + detail * LUM(textureLod(map, vMapUv + (o), 1.5).rgb))
        vec2 e = ts * 7.0;
        float hx = HH(vec2(e.x, 0.0)) - HH(vec2(-e.x, 0.0)), hy = HH(vec2(0.0, e.y)) - HH(vec2(0.0, -e.y));
        vec3 n = normalize(vec3(-hx * bump, -hy * bump, 1.0));
        // a main light from the upper left rounds the body; a warm lantern rim on the left edges, a cool moon rim on the right
        float shade = (1.0 - key) + key * 1.35 * max(dot(n, normalize(vec3(-0.55, 0.55, 0.62))), 0.0);
        vec3 rimW = vec3(1.0, 0.58, 0.28) * warm * pow(max(dot(n, normalize(vec3(-1.0, 0.1, 0.25))), 0.0), 2.0);
        vec3 rimC = vec3(0.45, 0.65, 1.0) * cool * pow(max(dot(n, normalize(vec3(1.0, 0.25, 0.2))), 0.0), 2.0);
        diffuseColor.rgb = diffuseColor.rgb * shade + (rimW + rimC) * diffuseColor.rgb * 1.6;
      }`);
  };
  return mat;
}
/** stand card c so the stage rectangle (x0, y0, W, H) lands on screen exactly, at the depth of the 3D point `at` */
function placeCard(c: Card, x0: number, y0: number, at: THREE.Vector3) {
  const fwd = V(0, 0, -1).applyQuaternion(cam.quaternion), D = at.clone().sub(cam.position).dot(fwd);
  const d = ray(x0 + c.W / 2, y0 + c.H / 2), unit = (2 * D * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / VH;
  c.m.position.copy(cam.position).addScaledVector(d, D / d.dot(fwd)); c.m.quaternion.copy(cam.quaternion); c.m.scale.set(c.W * unit, c.H * unit, 1); c.m.visible = true;
}
/** redraw a card (draw gets a context set to stage units, origin at x0, y0) */
function paintCard(c: Card, x0: number, y0: number, draw: (g: CanvasRenderingContext2D) => void, force = false) {
  if (!force && G.clock < c.due) return; c.due = G.clock + 0.05;
  const g = c.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.cv.width, c.cv.height); g.setTransform(PX, 0, 0, PX, -x0 * PX, -y0 * PX); draw(g); c.tex.needsUpdate = true;
}
// ---------- the scene ----------
let seatCards: Card[] = [], queueCards = new Map<number, Card>();
let seatBowls: Bowl3[] = [], passBowls: Bowl3[] = [], heldBowl: Bowl3, cups: THREE.Group[] = [], coins: THREE.Group[] = [], stains: THREE.Mesh[] = [];
let teapot: THREE.Group, teapotAt = V(), cloth: THREE.Group, clothAt = V(), stream: THREE.Mesh, guestY = 0, streetY = 0;
const rain: THREE.LineSegments[] = [], steam: THREE.Sprite[] = [];
function makeCup() {
  const g = new THREE.Group();
  add(lathe([[0.045, 0], [0.055, 0.005], [0.065, 0.11], [0.06, 0.11], [0.05, 0.01], [0, 0.01]], MAT.white, 24), g);
  const tea = mesh(new THREE.CircleGeometry(0.058, 20), CM.tea, false); tea.position.z = 0.02; add(tea, g); g.userData.tea = tea;
  const band = torus(0.062, 0.004, CM.blue); band.position.z = 0.085; add(band, g); return g;
}
function makeTeapot() {
  const g = new THREE.Group();
  const body = ball(0.16, M('#ffffff', 0.25, 0, { map: teapotTex, clearcoat: 0.6 }), 1, 1, 0.85); body.position.z = 0.14; add(body, g);
  const lid = cyl(0.07, 0.04, MAT.white); lid.position.z = 0.27; add(lid, g); const knob = ball(0.025, CM.blue); knob.position.z = 0.3; add(knob, g);
  const spout = cyl(0.025, 0.2, MAT.white, 12, 0.015); spout.rotation.set(0, -1.0, 0); spout.position.set(0.19, 0, 0.19); add(spout, g);
  const handle = torus(0.12, 0.012, MAT.black); handle.rotation.set(Math.PI / 2, 0, 0); handle.position.set(0, 0, 0.26); handle.scale.set(1, 0.8, 1); add(handle, g);
  return g;
}
function build() {
  scene = new THREE.Scene(); scene.background = new THREE.Color('#141C38'); scene.fog = new THREE.Fog('#141C38', 6, 16);
  cam = new THREE.PerspectiveCamera(30, VW / VH, 0.1, 80); cam.up.set(0, 0, 1);
  cam.position.set(0, -4.1, 2.45); cam.lookAt(0, 0.9, 1.15); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  // the counter: its top runs from the stage's bottom edge back to stage y 336
  const front = atZ(500, 470, Z0), back = atZ(500, 336, Z0), left = atZ(-40, 470, Z0).x - 0.4, right = atZ(1040, 470, Z0).x + 0.4, wd = right - left;
  const top = rbox(wd, back.y - front.y + 0.1, 0.08, MAT.woodL, 0.03); top.position.set(0, (back.y + front.y) / 2, Z0 - 0.04); add(top, scene);
  const cf = rbox(wd, 0.2, Z0 - 0.08, MAT.wood, 0.03); cf.position.set(0, front.y - 0.05, (Z0 - 0.08) / 2); add(cf, scene);
  for (let i = 0; i < 7; i++) { const d = rbox(wd / 7 - 0.06, 0.03, Z0 * 0.68, MAT.woodD, 0.02); d.position.set(left + (i + 0.5) * (wd / 7), front.y - 0.16, Z0 * 0.42); add(d, scene); }
  guestY = back.y + 0.42; streetY = guestY + 2.4;
  // stools behind the counter, the floor of the stall
  const floor = mesh(new THREE.PlaneGeometry(wd, 2), MAT.woodD); floor.position.set(0, back.y + 1, 0); add(floor, scene);
  // the stall's frame: posts, the roof beam, the noren, two lanterns, the shop sign
  const pl = atY(30, 200, guestY - 0.2).x, prr = atY(970, 200, guestY - 0.2).x;
  for (const x of [pl, prr]) { const p = rbox(0.2, 0.2, 2.8, MAT.wood, 0.04); p.position.set(x, guestY - 0.2, 1.4); add(p, scene); }
  const roofZ = atY(500, 6, guestY - 0.2).z;
  const beam = rbox(prr - pl + 0.5, 0.36, 0.2, MAT.woodD, 0.04); beam.position.set(0, guestY - 0.2, roofZ + 0.1); add(beam, scene);
  for (let i = 0; i < 6; i++) { const n = rbox((prr - pl) / 6 - 0.04, 0.03, 0.3, MAT.red, 0.015); n.position.set(pl + ((i + 0.5) * (prr - pl)) / 6, guestY - 0.4, roofZ - 0.12); add(n, scene); }
  for (const sx of [74, VW - 74]) {
    const p = atY(sx, 118, guestY - 0.45); const l = ball(0.2, MAT.lantern, 1, 1, 1.2); l.position.copy(p); add(l, scene);
    for (const dz of [0.25, -0.25]) { const c = cyl(0.13, 0.05, MAT.black); c.position.set(p.x, p.y, p.z + dz); add(c, scene); }
    const L = new THREE.PointLight('#FFA14A', 3, 5, 1.6); L.position.set(p.x, p.y - 0.25, p.z); add(L, scene);
  }
  const sg = atY(299, 174, streetY - 1.2), sign = mesh(new THREE.PlaneGeometry(0.34, 1.3), new THREE.MeshStandardMaterial({ map: signTex, emissive: '#5A1008', emissiveIntensity: 0.4 })); sign.rotation.x = Math.PI / 2; sign.position.copy(sg); add(sign, scene);
  // the street: a wet road, little houses with lit windows, lanterns, hydrangeas, rain
  const road = mesh(new THREE.PlaneGeometry(30, 14), CM.road); road.position.set(0, streetY + 4, 0); add(road, scene);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = side * (1.6 + i * 1.7), y = streetY + 1.2 + i * 1.5, h = 1.8 + ((i * 7) % 3) * 0.3;
    const hs = rbox(1.5, 1.2, h, CM.house, 0.05); hs.position.set(x, y, h / 2); add(hs, scene);
    const rf = cyl(1.12, 0.6, CM.roof, 4, 0.05); rf.rotation.z = Math.PI / 4; rf.position.set(x, y, h + 0.3); add(rf, scene);
    for (const wx of [-0.38, 0.38]) { const w = rbox(0.34, 0.04, 0.42, MAT.glow, 0.01); w.position.set(x + wx, y - 0.62, h * 0.55); add(w, scene); }
    for (let k = 0; k < 4; k++) { const hd = ball(0.2, CM.hyd[(i + k) % 3]); hd.position.set(x - side * 0.3 + (k - 1.5) * 0.3, y - 0.8, 0.22 + (k % 2) * 0.08); add(hd, scene); }
  }
  const sky = mesh(new THREE.PlaneGeometry(40, 12), MAT.night, false); sky.rotation.x = Math.PI / 2; sky.position.set(0, streetY + 9, 4); add(sky, scene);
  for (let i = 0; i < 3; i++) {
    const pos: number[] = []; for (let k = 0; k < 160; k++) { const x = (Math.random() - 0.5) * 9, y = guestY + 0.5 + Math.random() * 6, z = Math.random() * 3.6; pos.push(x, y, z, x - 0.02, y, z - 0.22); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const r = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#9CC3FF', transparent: true, opacity: 0.35 })); rain.push(r); add(r, scene);
  }
  // the pass from the kitchen, on the left of the counter
  const pa = atZ(146, 330, Z0), pw = span(146, 330, Z0, 230);
  const hatch = rbox(pw, 0.5, 0.75, MAT.woodD, 0.04); hatch.position.set(pa.x, pa.y + 0.2, Z0 + 0.37); add(hatch, scene);
  const hole = rbox(pw * 0.86, 0.06, 0.4, MAT.dark, 0.02); hole.position.set(pa.x, pa.y - 0.06, Z0 + 0.33); add(hole, scene);
  const shelf = rbox(pw * 0.95, 0.4, 0.04, MAT.woodL, 0.02); shelf.position.set(pa.x, pa.y - 0.12, Z0 + 0.1); add(shelf, scene);
  const ps = rbox(pw * 0.9, 0.04, 0.12, MAT.red, 0.02); ps.position.set(pa.x, pa.y - 0.08, Z0 + 0.66); add(ps, scene);
  // the dish tub, the cloth, the teapot
  const tb = atZ(CL.tub.x, CL.tub.y, Z0); const tub = rbox(span(CL.tub.x, CL.tub.y, Z0, 80), 0.2, 0.08, M('#5E7FA0', 0.4), 0.03); tub.position.set(tb.x, tb.y + 0.05, Z0 + 0.04); add(tub, scene);
  clothAt = atZ(CL.cloth.x, CL.cloth.y, Z0 + 0.02); cloth = new THREE.Group(); add(rbox(0.26, 0.16, 0.03, CM.cloth, 0.012), cloth); const st = rbox(0.26, 0.03, 0.032, CM.blue, 0.004); st.position.y = -0.04; add(st, cloth); add(cloth, scene);
  teapotAt = atZ(CL.teapot.x, CL.teapot.y + 20, Z0); teapot = makeTeapot(); add(teapot, scene);
  stream = cyl(0.008, 1, CM.tea, 8); stream.visible = false; add(stream, scene);
  for (let i = 0; i < 3; i++) { const B = makeBowl(span(500, 362, Z0, 104) / 2); B.g.visible = false; add(B.g, scene); seatBowls.push(B); }
  for (let i = 0; i < 4; i++) { const B = makeBowl(span(146, 330, Z0, 90) / 2); B.g.visible = false; add(B.g, scene); passBowls.push(B); }
  heldBowl = makeBowl(span(500, 362, Z0, 100) / 2); heldBowl.g.visible = false; add(heldBowl.g, scene);
  for (let i = 0; i < 3; i++) {
    const c = makeCup(); c.visible = false; add(c, scene); cups.push(c);
    const co = new THREE.Group(); for (let k = 0; k < 3; k++) { const d = cyl(0.045, 0.014, k === 2 ? CM.gold : CM.goldD, 20); d.position.set((k - 1) * 0.03, 0, 0.007 + k * 0.012); add(d, co); } co.visible = false; add(co, scene); coins.push(co);
    const sn = mesh(new THREE.CircleGeometry(1, 24), CM.stain, false); sn.scale.set(0.18, 0.06, 1); sn.visible = false; add(sn, scene); stains.push(sn);
  }
  for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, transparent: true, opacity: 0, depthWrite: false })); s.userData = { life: 9 }; add(s, scene); steam.push(s); }
  // light: warm key from the front, the lanterns, a cool moon behind
  scene.add(new THREE.HemisphereLight('#FFE3C4', '#2A2440', 0.55));
  const key = new THREE.DirectionalLight('#FFE0BC', 2.0); key.position.set(-2, -5, 6); key.target.position.set(0, 0.6, 1);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  const sc = key.shadow.camera as THREE.OrthographicCamera; sc.left = -4; sc.right = 4; sc.top = 3; sc.bottom = -3; sc.near = 0.5; sc.far = 16;
  scene.add(key, key.target);
  const moon = new THREE.DirectionalLight('#7FA8FF', 1.1); moon.position.set(2, 6, 5); scene.add(moon);
  // for the guests: a warm side light from the left lantern, a cool rim from the right
  const side = new THREE.DirectionalLight('#FFA860', 2.4); side.position.set(-5, -2.5, 2.2); side.target.position.set(0, guestY, 1.2); scene.add(side, side.target);
  const rimR = new THREE.DirectionalLight('#8FB6FF', 2.2); rimR.position.set(5, -0.5, 2.5); rimR.target.position.set(0, guestY, 1.2); scene.add(rimR, rimR.target);
  SCENES.push(scene);
}

// ---------- every frame ----------
const dragOf = (k: string) => { for (const it of PTRS.values()) if ((it as any).kind === k) return it as any; return null; };
const heldAt = (it: any, z = Z0 + 0.35) => atZ(it.x, it.y - LIFT, z);
function puff(at: THREE.Vector3) { const s = steam.find(s => s.userData.life >= 1.4); if (s) { s.position.copy(at); s.userData = { life: 0 }; } }
function moodOf(gg: any) {
  return gg.st === 'eat' ? 'eat' : gg.st === 'leave' ? (gg.sad ? 'hmm' : 'happy') : gg.st === 'refused' ? 'hmm' : gg.happyT > 0 ? 'happy' : gg.st === 'ask' ? 'ask' : '';
}
function sync(dt: number) {
  const t = G.clock;
  rain.forEach((r, i) => { r.position.z = -((t * 2 + i / 3) % 1) * 0.5; });
  // guests at their seats: the same placing, size, fading and clips as the 2D counter
  const dg = dragOf('guest'), pd = dragOf('pbowl'), pb = pd && C.pass.find((b: any) => b.id === pd.id);
  C.seats.forEach((s: any, i: number) => {
    const gg = s.g, c = seatCards[i] || (seatCards[i] = makeCard(380, 340));
    if (!gg) { c.m.visible = false; return; }
    const ken = kenOn(gg); let x = s.x, y = 318, sc = 1, a = 1;
    if (gg.st === 'walk') { const k = Math.min(1, gg.t / (ken ? kenLen('arrive') : 0.6)); x = gg.from + (s.x - gg.from) * k; y = 286 + (318 - 286) * k - (ken ? 0 : Math.sin(k * Math.PI) * 30); sc = 0.5 + 0.5 * k; }
    if (gg.st === 'leave' && ken) { const walk = gg.t - kenLen(gg.sad ? 'furious' : 'bye') / KSP, end = kenLeave(gg); if (walk > 0) x = s.x + walk * 170; a = clamp((end - gg.t) / 0.5, 0, 1); }
    else if (gg.st === 'leave') { a = Math.max(0, 1 - gg.t / 1.4); y = 318 + gg.t * 10; }
    gg.hover = !!(pb && gg.st === 'order' && Math.abs(pd.x - s.x) < 110 && pd.y > 150 && !judge(pb, gg.o).ok);
    const mood = moodOf(gg), x0 = s.x - 190, y0 = 318 - 290;
    paintCard(c, x0, y0, g => drawGuest(g, LOOKS[gg.who], x, y, sc, mood, { t: G.clock, bob: gg.st === 'eat' && !ken ? Math.sin(G.clock * 8) * 1.5 : 0, clip: ken ? kenClip(gg) : null }));
    c.mat.opacity = a; placeCard(c, x0, y0, atY(s.x, 300, guestY));
  });
  // guests waiting in the rain, under their umbrellas
  const seen = new Set<number>();
  C.queue.forEach((q: any) => {
    if (dg && dg.id === q.id) return; seen.add(q.id);
    let c = queueCards.get(q.id); if (!c) { c = makeCard(160, 210); queueCards.set(q.id, c); }
    const D = C.door, inDoor = D && q.grp === D.grp, qm = inDoor && D.conf > 0 ? 'hmm' : inDoor && D.happy > 0 ? 'happy' : '';
    const x0 = q.x - 80, y0 = 120, bob = Math.sin(G.clock * 2 + q.id) * 1.2;
    paintCard(c, x0, y0, g => {
      drawGuest(g, LOOKS[q.who], q.x, 286 + bob, 0.5, qm, { clip: { id: qm === 'hmm' ? 'confused' : 'idle', t: G.clock + q.id, loop: true } });
      g.fillStyle = ['#E36A5A', '#6C8BE0', '#F2C94C', '#7FBF8F'][q.id % 4]; g.beginPath(); g.ellipse(q.x, 286 - 104 + bob, 40, 16, 0, Math.PI, TAU); g.fill();
      g.strokeStyle = '#3A2A20'; g.lineWidth = 2; g.beginPath(); g.moveTo(q.x, 286 - 104 + bob); g.lineTo(q.x, 286 - 40 + bob); g.stroke();
    });
    placeCard(c, x0, y0, atZ(q.x, 268, 0.62));
  });
  for (const [id, c] of queueCards) if (!seen.has(id)) { scene.remove(c.m); c.tex.dispose(); queueCards.delete(id); }
  // bowls in front of the guests, cups, coins, spills
  const dd = dragOf('refused'), di = dragOf('dish');
  C.seats.forEach((s: any, i: number) => {
    const gg = s.g, B = seatBowls[i], cup = cups[i];
    const showB = !!s.bowl && !(dd && dd.si === s.i) && !(di && di.si === s.i);
    B.g.visible = showB; if (showB) { const p = atZ(s.x, 362, Z0 + B.r * 0.62); B.g.position.set(p.x, p.y, Z0); const e = s.bowl.eat || 0; fillBowl(B, { ...s.bowl, broth: (s.bowl.broth || 0) * (1 - e), tops: e > 0.5 ? [] : s.bowl.tops, noodles: e > 0.85 ? null : s.bowl.noodles }, s.x, 362, atZ); if ((s.bowl.broth || 0) > 0.3 && !e && Math.random() < dt * 1.4) puff(V(p.x, p.y, Z0 + 0.25)); }
    cup.visible = !!(gg && gg.st !== 'walk'); if (cup.visible) { const p = atZ(cupX(s), CUPY + 10, Z0); cup.position.set(p.x, p.y, Z0); const tea = cup.userData.tea as THREE.Mesh; tea.visible = s.cup > 0.02; tea.position.z = 0.015 + Math.min(1, s.cup) * 0.08; }
    coins[i].visible = !!s.coins; if (s.coins) { const p = atZ(s.x + 92, 392, Z0); coins[i].position.set(p.x, p.y, Z0); coins[i].rotation.z = Math.sin(t * 3 + i) * 0.2; }
    stains[i].visible = s.dirty > 0.01; if (s.dirty) { const p = atZ(s.x, 392, Z0 + 0.002); stains[i].position.set(p.x, p.y, Z0 + 0.003); (stains[i].material as THREE.MeshBasicMaterial).opacity = Math.min(1, s.dirty) * 0.55; }
  });
  // the pass: bowls from the kitchen
  passBowls.forEach((B, j) => {
    const b = C.pass[j], show = !!b && !(pd && pd.id === b.id); B.g.visible = show; if (!show) return;
    const P = CL.pass[j % 2], y = P.y + (j > 1 ? -14 : 0), p = atZ(P.x, y, Z0 + 0.12 + B.r * 0.6); B.g.position.set(p.x, p.y, Z0 + 0.12); fillBowl(B, b, P.x, y, atZ);
  });
  // whatever is in your hand
  heldBowl.g.visible = false;
  const hb = pd ? pb : dd ? C.seats[dd.si]?.bowl : di ? C.seats[di.si]?.bowl : null, hit = pd || dd || di;
  if (hit && hb) { heldBowl.g.visible = true; const p = heldAt(hit); heldBowl.g.position.set(p.x, p.y, p.z - 0.1); fillBowl(heldBowl, hb, hit.x, hit.y - LIFT, atZ); }
  const dt_ = dragOf('teapot');
  if (dt_) { const p = heldAt(dt_, Z0 + 0.45); teapot.position.copy(p); teapot.rotation.set(0, dt_.over != null ? -0.8 : -0.15, 0); }
  else { teapot.position.copy(teapotAt); teapot.rotation.set(0, 0, -0.5); }
  stream.visible = !!(dt_ && dt_.over != null);
  if (stream.visible) { const s = C.seats[dt_.over], tip = teapot.localToWorld(V(0.27, 0, 0.12)), cp = atZ(cupX(s), CUPY + 10, Z0 + 0.08), len = tip.distanceTo(cp); stream.position.copy(tip.clone().lerp(cp, 0.5)); stream.scale.set(1, 1, len); stream.lookAt(cp); }
  const dc = dragOf('cloth');
  if (dc) { const p = heldAt(dc, Z0 + 0.05); cloth.position.copy(p); cloth.rotation.z = Math.sin(t * 20) * 0.15; } else { cloth.position.copy(clothAt); cloth.rotation.z = 0.1; }
  for (const s of steam) { const u = s.userData; if (u.life >= 1.4) { (s.material as THREE.SpriteMaterial).opacity = 0; continue; } u.life += dt; s.position.z += dt * 0.3; const k = u.life / 1.4; s.scale.setScalar(0.12 * (1 + k * 1.5)); (s.material as THREE.SpriteMaterial).opacity = 0.4 * Math.sin(Math.PI * k); }
}

// ---------- the words and marks over the 3D ----------
function words() {
  const g = ctx, dk = dragOf;
  g.textAlign = 'center';
  C.queue.forEach((q: any) => { if (dk('guest')?.id === q.id) return; const ph = (G.clock * 1.4) % 1; g.strokeStyle = `rgba(94,211,176,${(0.9 * (1 - ph)).toFixed(2)})`; g.lineWidth = 3; el(g, q.x, 250, 30 + ph * 14, 42 + ph * 14); g.stroke(); });
  C.seats.forEach((s: any) => {
    const gg = s.g;
    if (!gg) { if (dk('guest') && freeSeat() === s.i) { g.strokeStyle = 'rgba(94,211,176,.95)'; g.lineWidth = 3; g.setLineDash([8, 6]); rr(g, s.x - 62, 150, 124, 170, 24); g.stroke(); g.setLineDash([]); } return; }
    if (gg.st !== 'walk') { g.fillStyle = 'rgba(255,244,226,.9)'; g.font = '900 12px "M PLUS Rounded 1c"'; g.textAlign = 'right'; g.fillText(LOOKS[gg.who].nm, s.x - 84, 168); g.textAlign = 'center'; }
    if (gg.st === 'ask') { const p = 1 + Math.sin(G.clock * 6) * 0.06; g.save(); g.translate(s.x + 96, 140); g.scale(p, p); rr(g, -22, -18, 44, 32, 12); g.fillStyle = '#FFF4E2'; g.fill(); g.fillStyle = '#D8452F'; g.font = '900 22px "M PLUS Rounded 1c"'; g.fillText('！', 0, 7); g.restore(); }
    if (gg.st === 'leave' && !gg.sad) bubble(g, s.x, 110, C.last === gg.who && C.next >= NIGHTS[C.n - 1].guests.length ? 'ごちそうさまでした！' : 'ごちそうさま！');
    if ((gg.st === 'order' || gg.st === 'refused') && !NIGHTS[C.n - 1].gentle) { const p = clamp(gg.pat, 0, 1); g.strokeStyle = p > 0.5 ? 'rgba(94,211,176,.9)' : p > 0.25 ? 'rgba(240,176,78,.95)' : 'rgba(224,106,78,1)'; g.lineWidth = 4; g.beginPath(); g.arc(s.x, 226, 84, -Math.PI / 2, -Math.PI / 2 + p * TAU); g.stroke(); }
    g.strokeStyle = 'rgba(94,211,176,.9)'; g.lineWidth = 3; g.setLineDash([6, 5]);
    if (dk('teapot') && gg.st !== 'walk' && gg.st !== 'leave') { el(g, cupX(s), CUPY, 30, 24); g.stroke(); }
    if (dk('pbowl') && (gg.st === 'order' || gg.st === 'refused') && !s.bowl) { el(g, s.x, 372, 74, 28); g.stroke(); }
    g.setLineDash([]);
    if (s.dirty) { const ph = (G.clock * 1.2) % 1; g.strokeStyle = `rgba(94,211,176,${(0.8 * (1 - ph)).toFixed(2)})`; g.lineWidth = 3; g.setLineDash([7, 7]); g.lineDashOffset = -ph * 28; g.beginPath(); g.moveTo(s.x - 64, 412); g.lineTo(s.x + 64, 412); g.stroke(); g.setLineDash([]); }
    if (s.bowl?.refused && !dk('refused')) { g.fillStyle = '#D8452F'; rr(g, s.x - 40, 404, 80, 18, 9); g.fill(); g.fillStyle = '#FFF4E2'; g.font = '900 10px "M PLUS Rounded 1c"'; g.fillText(T('send it back', '退回厨房'), s.x, 417); }
  });
  const dg = dk('guest'), lead = dg && C.queue.find((q: any) => q.id === dg.id);
  if (lead) drawGuest(g, LOOKS[lead.who], dg.x, dg.y - LIFT + 40, 0.62, '', {});
  if (dk('refused') || dk('dish')) { g.strokeStyle = 'rgba(94,211,176,.95)'; g.lineWidth = 3; g.setLineDash([8, 6]); if (dk('refused')) rr(g, 40, 214, 214, 140, 10); else rr(g, CL.tub.x - 50, CL.tub.y - 24, 100, 52, 12); g.stroke(); g.setLineDash([]); }
}
function render(dt: number) { sync(dt); drawScene(scene, cam, dt); if (C) words(); }
export function initCounter3D() {
  build();
  HOOK3D.counter = (dt: number) => { if (!C) return; render(dt); };
  (window as any).__c3d = { scene, cam, atZ };
}
