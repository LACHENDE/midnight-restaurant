// まよなか屋 · floor: the restaurant's layout, its kitchen stations, the guests, the dishes, the lines and the shift

/** the floor plan in world units (the canvas scales it to the phone) */
export const WORLD = { w: 1000, h: 560 };
/** the wall between the dining room and the kitchen; it is open below gapY */
export const DIVIDER = { x0: 636, x1: 662, gapY: 470 };

export interface Table { id: number; x: number; y: number; seats: number; r: number }
export const TABLES: Table[] = [
  { id: 1, x: 250, y: 165, seats: 2, r: 40 },
  { id: 2, x: 485, y: 165, seats: 4, r: 56 },
  { id: 3, x: 250, y: 385, seats: 2, r: 40 },
  { id: 4, x: 485, y: 385, seats: 4, r: 56 },
];
export const TABLE_JP = ['', 'いちばん', 'にばん', 'さんばん', 'よんばん'];
/** where guests sit around a table (offsets from its centre) */
export const chairsOf = (t: Table): { x: number; y: number }[] =>
  t.seats === 2
    ? [{ x: -t.r - 30, y: 0 }, { x: t.r + 30, y: 0 }]
    : [{ x: -t.r - 28, y: -24 }, { x: t.r + 28, y: -24 }, { x: -t.r - 28, y: 30 }, { x: t.r + 28, y: 30 }];

export const DOOR = { x: 100, y: 505 }; // where the front group stands when it comes in
export const QUEUE = { x: 100, y: 600 }; // the next group waits just outside
export const OUTSIDE = { x: 100, y: 680 };
export const BENCH = { x: 52, y: 300 }; // where a group waits for a table

export type StationKind = 'bowls' | 'tamago' | 'negi' | 'naruto' | 'noodles' | 'pot' | 'trash' | 'sink' | 'island' | 'pass';
/** a kitchen station: its counter rect, and the spot a cook stands at to use it (ax, ay) */
export interface Station { id: string; kind: StationKind; x0: number; y0: number; x1: number; y1: number; ax: number; ay: number }
const st = (id: string, kind: StationKind, x0: number, y0: number, x1: number, y1: number, ax: number, ay: number): Station => ({ id, kind, x0, y0, x1, y1, ax, ay });
export const STATIONS: Station[] = [
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
];
/** plain counters (no station): they only block */
export const COUNTERS = [
  { x0: 662, y0: 30, x1: 1000, y1: 78 },
  { x0: 952, y0: 78, x1: 1000, y1: 512 },
  { x0: 760, y0: 512, x1: 1000, y1: 560 },
  { x0: 770, y0: 256, x1: 870, y1: 306 },
];

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
