// layout

// fitted to the painted kitchen (art/kitchen.webp): the basket hangs from its hook, the broth pot stands on the steel top, the pass is the hatch at the right
export const KL = {
  box: { x: 96, y: 384 },
  hook: { x: 84, y: 265 },
  pot: { x: 324, y: 300 },
  broth: { x: 572, y: 262 },
  ladle: { x: 604, y: 242 },
  slots: [
    { x: 534, y: 334 },
    { x: 694, y: 334 },
  ],
  trays: { tamago: { x: 236, y: 408 }, negi: { x: 376, y: 408 }, naruto: { x: 516, y: 408 } },
  scrap: { x: 752, y: 418 },
  pass: { x: 908, y: 350 },
  dial: { x: 324, y: 186 },
};
export const CL = {
  pass: [
    { x: 96, y: 322 },
    { x: 196, y: 322 },
  ],
  tub: { x: 930, y: 432 },
  teapot: { x: 900, y: 376 },
  cloth: { x: 810, y: 438 },
  queue: [
    { x: 880, y: 292 },
    { x: 950, y: 300 },
    { x: 820, y: 302 },
  ],
};
export const seatX = n => (n === 1 ? [560] : n === 3 ? [330, 560, 790] : [470, 700]);
