// まよなか屋 · floor: the restaurant's layout, its kitchen stations, the guests, the dishes, the lines and the shift

export interface Pt { x: number; y: number }
export interface Box { x0: number; y0: number; x1: number; y1: number }
export interface Table { id: number; x: number; y: number; seats: number; r: number }
export const TABLE_JP = ['', 'いちばん', 'にばん', 'さんばん', 'よんばん'];
export type StationKind = 'bowls' | 'tamago' | 'negi' | 'naruto' | 'noodles' | 'pot' | 'trash' | 'sink' | 'island' | 'pass';
/** a kitchen station: its counter rect, and the spot a cook stands at to use it (ax, ay) */
export interface Station extends Box { id: string; kind: StationKind; ax: number; ay: number }
const st = (id: string, kind: StationKind, x0: number, y0: number, x1: number, y1: number, ax: number, ay: number): Station => ({ id, kind, x0, y0, x1, y1, ax, ay });

/** The two shops, in world units (the canvas scales them to the phone). 'wide' fills a phone held sideways. 'tall' is the
 * owner's picture, for a phone held upright: the entrance under the noren at the top, the dining room on the left, the
 * kitchen on the right, the pass on the counter between them. The host's phone picks one at the start; both play it. */
export type RoomId = 'wide' | 'tall';
export interface RoomDef {
  world: { w: number; h: number };
  divider: Box; // the counter between the dining room and the kitchen; you walk round its open end
  walls: Box[]; // the walls, with a gap for the door
  bench: Box; // where a group waits for a table
  tables: Table[]; stations: Station[]; counters: Box[];
  door: Pt; outside: Pt;
  start: [Pt, Pt]; // where the two waiters start
  exit: { y: number; dir: 1 | -1 }; // waiters stay indoors: never past y in this direction
  gridY: [number, number]; // the paths' grid reaches outside, where guests come from
  chairs: 'sides' | 'ns'; // seats beside a table, or behind and in front of it (the tall shop's 3/4 view)
  doorSpot: (i: number) => Pt; queueSpot: (i: number) => Pt; byeSpot: (i: number) => Pt; benchSpot: (i: number) => Pt;
  headY: (t: Table) => number; // where a seated group's bubble goes
  ring: [number, number]; // a pot's doneness ring, from the pot's centre
}
const WIDE: RoomDef = {
  world: { w: 1000, h: 560 },
  divider: { x0: 636, y0: 0, x1: 662, y1: 470 },
  walls: [
    { x0: -60, y0: -60, x1: 1060, y1: 30 }, // back wall
    { x0: -60, y0: -60, x1: 26, y1: 760 }, // left wall
    { x0: 1000, y0: -60, x1: 1060, y1: 760 }, // right wall
    { x0: -60, y0: 560, x1: 50, y1: 760 }, // the front wall, with the door between x 50 and 150
    { x0: 150, y0: 560, x1: 1060, y1: 760 },
  ],
  bench: { x0: 26, y0: 230, x1: 44, y1: 370 },
  tables: [
    { id: 1, x: 250, y: 165, seats: 2, r: 40 },
    { id: 2, x: 485, y: 165, seats: 4, r: 56 },
    { id: 3, x: 250, y: 385, seats: 2, r: 40 },
    { id: 4, x: 485, y: 385, seats: 4, r: 56 },
  ],
  stations: [
    st('bowls', 'bowls', 676, 30, 744, 78, 710, 100),
    st('tamago', 'tamago', 752, 30, 812, 78, 782, 100),
    st('negi', 'negi', 820, 30, 880, 78, 850, 100),
    st('naruto', 'naruto', 888, 30, 948, 78, 918, 100),
    st('noodles', 'noodles', 952, 100, 1000, 168, 930, 134),
    st('pot0', 'pot', 952, 186, 1000, 250, 930, 218),
    st('pot1', 'pot', 952, 266, 1000, 330, 930, 298),
    st('trash', 'trash', 952, 420, 1000, 470, 930, 445),
    st('sink', 'sink', 790, 512, 890, 560, 840, 490),
    st('island0', 'island', 770, 256, 820, 306, 795, 330),
    st('island1', 'island', 820, 256, 870, 306, 845, 330),
    st('pass0', 'pass', 636, 236, 662, 284, 684, 260),
    st('pass1', 'pass', 636, 284, 662, 332, 684, 308),
  ],
  counters: [
    { x0: 662, y0: 30, x1: 1000, y1: 78 },
    { x0: 952, y0: 78, x1: 1000, y1: 512 },
    { x0: 760, y0: 512, x1: 1000, y1: 560 },
    { x0: 770, y0: 256, x1: 870, y1: 306 },
  ],
  door: { x: 100, y: 505 }, outside: { x: 100, y: 680 },
  start: [{ x: 560, y: 470 }, { x: 820, y: 400 }],
  exit: { y: 548, dir: 1 },
  gridY: [0, 720],
  chairs: 'sides',
  doorSpot: i => ({ x: 88 + (i % 2) * 34, y: 513 - Math.floor(i / 2) * 32 }),
  queueSpot: i => ({ x: 190 + i * 26, y: 530 }),
  byeSpot: i => ({ x: 140 + (i % 2) * 34, y: 455 - Math.floor(i / 2) * 32 }),
  benchSpot: i => ({ x: 60, y: 246 + i * 36 }),
  headY: t => t.y - t.r * 0.8 - 40,
  ring: [-34, 0],
};
const TALL: RoomDef = {
  world: { w: 600, h: 1080 },
  divider: { x0: 330, y0: 262, x1: 356, y1: 700 },
  walls: [
    { x0: -60, y0: -260, x1: 190, y1: 270 }, // the shop front, with the entrance between x 190 and 290
    { x0: 290, y0: -260, x1: 356, y1: 270 },
    { x0: 356, y0: -260, x1: 660, y1: 262 }, // the kitchen's back wall
    { x0: -60, y0: -260, x1: 14, y1: 1200 }, // left wall
    { x0: 590, y0: -260, x1: 660, y1: 1200 }, // right wall
    { x0: -60, y0: 850, x1: 660, y1: 1200 }, // the railing at the bottom
  ],
  bench: { x0: 14, y0: 500, x1: 30, y1: 600 },
  tables: [
    { id: 1, x: 100, y: 440, seats: 2, r: 40 },
    { id: 2, x: 250, y: 440, seats: 4, r: 50 },
    { id: 3, x: 100, y: 660, seats: 2, r: 40 },
    { id: 4, x: 250, y: 660, seats: 4, r: 50 },
  ],
  stations: [
    st('bowls', 'bowls', 390, 262, 444, 312, 417, 336),
    st('tamago', 'tamago', 412, 500, 455, 538, 433, 478),
    st('negi', 'negi', 455, 500, 498, 538, 476, 478),
    st('naruto', 'naruto', 498, 500, 542, 538, 520, 478),
    st('noodles', 'noodles', 552, 384, 600, 440, 528, 412),
    st('pot0', 'pot', 458, 262, 514, 316, 486, 340),
    st('pot1', 'pot', 528, 262, 584, 316, 556, 340),
    st('trash', 'trash', 552, 640, 600, 690, 528, 665),
    st('sink', 'sink', 468, 790, 586, 836, 527, 768),
    st('island0', 'island', 412, 538, 477, 580, 444, 602),
    st('island1', 'island', 477, 538, 542, 580, 510, 602),
    st('pass0', 'pass', 330, 430, 356, 478, 378, 454),
    st('pass1', 'pass', 330, 478, 356, 526, 378, 502),
  ],
  counters: [
    { x0: 444, y0: 262, x1: 590, y1: 316 }, // the stove
    { x0: 412, y0: 500, x1: 542, y1: 580 }, // the prep island
  ],
  door: { x: 240, y: 330 }, outside: { x: 240, y: -170 },
  start: [{ x: 170, y: 560 }, { x: 470, y: 690 }],
  exit: { y: 296, dir: -1 },
  gridY: [-240, 1080],
  chairs: 'ns',
  doorSpot: i => ({ x: 228 + (i % 2) * 34, y: 330 + Math.floor(i / 2) * 30 }),
  queueSpot: i => ({ x: 176 - i * 28, y: 316 }),
  byeSpot: i => ({ x: 292 + (i % 2) * 26, y: 336 + Math.floor(i / 2) * 28 }),
  benchSpot: i => ({ x: 46, y: 508 + i * 30 }),
  headY: t => t.y - 124,
  ring: [0, -50],
};
const copy = <T,>(a: T[]) => a.map(o => ({ ...o }));
/** the shop being played; the names below are the same objects, refilled when the shop changes */
export const ROOM: RoomDef & { id: RoomId } = { id: 'wide', ...WIDE };
export const WORLD = { ...WIDE.world };
export const DIVIDER: Box = { ...WIDE.divider };
export const TABLES: Table[] = copy(WIDE.tables);
export const STATIONS: Station[] = copy(WIDE.stations);
export const COUNTERS: Box[] = copy(WIDE.counters);
export const DOOR: Pt = { ...WIDE.door };
export const OUTSIDE: Pt = { ...WIDE.outside };
/** switch the shop (world.ts rebuilds the walls and the paths around it: call useRoom there) */
export function applyRoom(id: RoomId) {
  const d = id === 'tall' ? TALL : WIDE;
  Object.assign(ROOM, d, { id }); Object.assign(WORLD, d.world); Object.assign(DIVIDER, d.divider); Object.assign(DOOR, d.door); Object.assign(OUTSIDE, d.outside);
  TABLES.splice(0, TABLES.length, ...copy(d.tables)); STATIONS.splice(0, STATIONS.length, ...copy(d.stations)); COUNTERS.splice(0, COUNTERS.length, ...copy(d.counters));
}
/** where guests sit (offsets from a table's centre): beside it in the wide shop; in the tall one behind it (the table
 * hides their legs) and in front of it, on the stools */
export const chairsOf = (t: Table): Pt[] => {
  const front = t.r * 0.8 + 30;
  if (ROOM.chairs === 'ns') return t.seats === 2 ? [{ x: 0, y: -14 }, { x: 0, y: front }] : [{ x: -24, y: -14 }, { x: 24, y: -14 }, { x: -24, y: front }, { x: 24, y: front }];
  return t.seats === 2
    ? [{ x: -t.r - 30, y: 0 }, { x: t.r + 30, y: 0 }]
    : [{ x: -t.r - 28, y: -24 }, { x: t.r + 28, y: -24 }, { x: -t.r - 28, y: 30 }, { x: t.r + 28, y: 30 }];
};

export const WHO = ['haru', 'ken', 'mika', 'sora', 'yuki'] as const;
export type Who = (typeof WHO)[number];
/** where each painted guest's blank face is (fractions of the picture): centre x, top under the bangs */
export const FACE: Record<Who, { x: number; t: number }> = {
  haru: { x: 0.47, t: 0.452 }, ken: { x: 0.486, t: 0.414 }, mika: { x: 0.485, t: 0.369 }, sora: { x: 0.487, t: 0.395 }, yuki: { x: 0.484, t: 0.344 },
};

export type Dish = 'tamago' | 'negi' | 'naruto';
export const DISHES: Record<Dish, { k: string; ro: string; m: [string, string] }> = {
  tamago: { k: 'たまご', ro: 'tamago', m: ['egg', '鸡蛋'] },
  negi: { k: 'ねぎ', ro: 'negi', m: ['spring onion', '葱'] },
  naruto: { k: 'なると', ro: 'naruto', m: ['fish cake', '鱼板'] },
};
export const DISH_IDS: Dish[] = ['tamago', 'negi', 'naruto'];
export const PIECES = ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ'];
export const COUNT = ['', 'ひとりです', 'ふたりです', 'さんにんです', 'よにんです'];

/** cooking: noodles are raw for 4 s, perfect until 9, soft until 13, then burnt */
export const COOK = { ready: 4, soft: 9, burnt: 13 };

/** the shift: 3 minutes, the last one is rush hour; money for 1–3 stars */
export const SHIFT = { len: 180, rush: 120, stars: [2500, 5000, 8000], maxWalkouts: 3 };

/** the 接客 lines: as staff write them, the reading for kanji, romaji, meaning, and what the microphone may hear */
export interface Phrase { k: string; r?: string; ro: string; m: [string, string]; say: string[] }
export const PHRASES: Record<string, Phrase> = {
  irasshai: { k: 'いらっしゃいませ', ro: 'irasshaimase', m: ['Welcome!', '欢迎光临！'], say: ['いらっしゃいませ', 'いらっしゃい'] },
  nanmei: { k: '何名様ですか', r: 'なんめいさまですか', ro: 'nanmei-sama desu ka', m: ['How many are you?', '请问几位？'], say: ['なんめいさまですか', '何名様ですか', '何名さまですか', '何名様', 'なんめいさま', '何名ですか'] },
  douzo: { k: 'こちらへどうぞ', ro: 'kochira e dōzo', m: ['This way, please.', '这边请。'], say: ['こちらへどうぞ', 'こちらにどうぞ', 'こちらへ'] },
  shoushou: { k: '少々お待ちください', r: 'しょうしょうおまちください', ro: 'shōshō omachi kudasai', m: ['One moment, please.', '请稍等。'], say: ['しょうしょうおまちください', '少々お待ちください', '少々お待ち下さい', 'おまちください', 'お待ちください'] },
  gochuumon: { k: 'ご注文はお決まりですか', r: 'ごちゅうもんはおきまりですか', ro: 'go-chūmon wa okimari desu ka', m: ['Ready to order?', '可以点餐了吗？'], say: ['ごちゅうもんはおきまりですか', 'ご注文はお決まりですか', 'ご注文は', 'ごちゅうもん'] },
  omatase: { k: 'お待たせしました', r: 'おまたせしました', ro: 'omatase shimashita', m: ['Here you are!', '让您久等了。'], say: ['おまたせしました', 'お待たせしました', 'お待たせいたしました', 'おまたせ'] },
  arigatou: { k: 'ありがとうございました', ro: 'arigatō gozaimashita', m: ['Thank you!', '谢谢光临！'], say: ['ありがとうございました', 'ありがとうございます', 'ありがとう'] },
};
export const LINE_IDS = Object.keys(PHRASES);

/** what the action button says it will do: a Japanese verb and its meaning */
export const ACTION_LABEL: Record<string, [string, string, string]> = {
  noodles: ['めん', 'noodles', '面'], boil: ['ゆでる', 'boil', '煮'], plate: ['もる', 'into bowl', '盛'], dump: ['すてる', 'dump', '倒掉'],
  bowl: ['どんぶり', 'bowl', '碗'], top: ['のせる', 'add', '加'], trash: ['すてる', 'trash', '扔掉'], wash: ['あらう', 'wash', '洗'],
  put: ['おく', 'put down', '放下'], take: ['とる', 'pick up', '拿起'], clear: ['さげる', 'clear', '收拾'], seat: ['あんない', 'seat', '入座'],
};
