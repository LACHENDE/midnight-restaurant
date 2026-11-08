// Controls: a floating joystick on the left half of the screen, the action button and the line buttons on the right;
// on a keyboard, WASD / arrows move, Space or E is the action, 1–3 say a line, M listens with the microphone, Q R F use abilities.
export const STICK = { x: 0, y: 0 }; // -1..1 on each axis
const base = document.getElementById('stick')!, knob = base.firstElementChild as HTMLElement;
const R = 56; // how far the knob travels, in CSS px
let pid: number | null = null, ox = 0, oy = 0;
const keys = new Set<string>();
export function bindInput(canvas: HTMLCanvasElement, on: { act: () => void; line: (i: number) => void; mic: () => void; active: () => boolean; tall: () => boolean; ab: (i: number) => void }) {
  canvas.addEventListener('pointerdown', e => {
    if (!on.active() || pid !== null) return;
    // sideways: anywhere on the left; upright (the tall shop): the lower left, where the stick rests
    if (on.tall() ? e.clientX > innerWidth * 0.62 || e.clientY < innerHeight * 0.45 : e.clientX > innerWidth * 0.6) return;
    pid = e.pointerId; ox = e.clientX; oy = e.clientY; canvas.setPointerCapture(e.pointerId);
    base.classList.remove('rest'); base.hidden = false; base.style.left = `${ox}px`; base.style.top = `${oy}px`; knob.style.transform = 'translate(-50%,-50%)';
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== pid) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    STICK.x = dx / R; STICK.y = dy / R; knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  });
  const end = (e: PointerEvent) => { if (e.pointerId !== pid) return; pid = null; STICK.x = 0; STICK.y = 0; restStick(on.tall()); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  addEventListener('keydown', e => {
    if (!on.active() || (e.target as Element)?.tagName === 'INPUT') return;
    const k = e.key.toLowerCase(); keys.add(k);
    if (k === ' ' || k === 'e' || k === 'enter') { e.preventDefault(); if (!e.repeat) on.act(); }
    if (k === '1' || k === '2' || k === '3') on.line(+k - 1);
    if (k === 'm' && !e.repeat) on.mic();
    if ((k === 'q' || k === 'r' || k === 'f') && !e.repeat) on.ab('qrf'.indexOf(k));
    keyStick();
  });
  addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); keyStick(); });
  addEventListener('blur', () => { keys.clear(); keyStick(); });
}
/** the stick when no thumb is on it: hidden sideways; upright it waits at the bottom left */
export function restStick(show: boolean) { base.style.left = ''; base.style.top = ''; knob.style.transform = 'translate(-50%,-50%)'; base.classList.toggle('rest', show); base.hidden = !show; }
function keyStick() {
  if (pid !== null) return;
  const x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const y = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  const d = Math.hypot(x, y) || 1; STICK.x = x / d; STICK.y = y / d;
}
