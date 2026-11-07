// まよなか屋 · floor (top-down): the room, the guests, the lines

/** the floor plan in world units (the canvas scales it to the phone) */
export const WORLD = { w: 1000, h: 560 };

export interface Table { id: string; x: number; y: number; seats: number; r: number }
export const TABLES: Table[] = [
  { id: 'A', x: 290, y: 165, seats: 2, r: 44 },
  { id: 'B', x: 290, y: 395, seats: 2, r: 44 },
  { id: 'C', x: 560, y: 165, seats: 4, r: 62 },
  { id: 'D', x: 560, y: 395, seats: 4, r: 62 },
];
/** where guests sit around a table (offsets from its centre) */
export const chairsOf = (t: Table): { x: number; y: number }[] =>
  t.seats === 2
    ? [{ x: -t.r - 30, y: 0 }, { x: t.r + 30, y: 0 }]
    : [{ x: -t.r - 28, y: -26 }, { x: t.r + 28, y: -26 }, { x: -t.r - 28, y: 30 }, { x: t.r + 28, y: 30 }];

export const DOOR = { x: 110, y: 505 }; // where a group stands when it comes in
export const OUTSIDE = { x: 110, y: 640 }; // where it comes from and goes back to
export const BENCH = { x: 62, y: 330 }; // where a group waits for a table
export const PASS = { x: 868, y: 280 }; // the hatch to the kitchen: tickets go in, bowls come out
export const START = { x: 760, y: 300 };

export const WHO = ['haru', 'ken', 'mika', 'sora', 'yuki'] as const;
export type Who = (typeof WHO)[number];
/** where each painted guest's blank face is (fractions of the picture): centre x, top under the bangs */
export const FACE: Record<Who, { x: number; t: number }> = {
  haru: { x: 0.47, t: 0.452 },
  ken: { x: 0.486, t: 0.414 },
  mika: { x: 0.485, t: 0.369 },
  sora: { x: 0.487, t: 0.395 },
  yuki: { x: 0.484, t: 0.344 },
};

export const DISHES = {
  tamago: { k: 'たまご', ro: 'tamago', m: ['egg ramen', '鸡蛋拉面'] },
  negi: { k: 'ねぎ', ro: 'negi', m: ['spring-onion ramen', '葱花拉面'] },
  naruto: { k: 'なると', ro: 'naruto', m: ['naruto ramen', '鱼板拉面'] },
} as const;
export type Dish = keyof typeof DISHES;

/** the night's groups: how many, in order */
export const SHIFT = [1, 2, 4, 2, 3, 1, 4];

/** the 接客 lines: as staff write them, the reading for kanji, romaji, meaning, and what the microphone may hear */
export interface Phrase { k: string; r?: string; ro: string; m: [string, string]; say: string[] }
export const PHRASES: Record<string, Phrase> = {
  irasshai: { k: 'いらっしゃいませ', ro: 'irasshaimase', m: ['Welcome!', '欢迎光临！'], say: ['いらっしゃいませ', 'いらっしゃい'] },
  nanmei: { k: '何名様ですか', r: 'なんめいさまですか', ro: 'nanmei-sama desu ka', m: ['How many are you?', '请问几位？'], say: ['なんめいさまですか', '何名様ですか', '何名さまですか', '何名様', 'なんめいさま', '何名ですか'] },
  douzo: { k: 'こちらへどうぞ', ro: 'kochira e dōzo', m: ['This way, please.', '这边请。'], say: ['こちらへどうぞ', 'こちらにどうぞ', 'こちらへ'] },
  shoushou: { k: '少々お待ちください', r: 'しょうしょうおまちください', ro: 'shōshō omachi kudasai', m: ['One moment, please.', '请稍等。'], say: ['しょうしょうおまちください', '少々お待ちください', '少々お待ち下さい', 'おまちください', 'お待ちください'] },
  gochuumon: { k: 'ご注文はお決まりですか', r: 'ごちゅうもんはおきまりですか', ro: 'go-chūmon wa okimari desu ka', m: ['Are you ready to order?', '可以点餐了吗？'], say: ['ごちゅうもんはおきまりですか', 'ご注文はお決まりですか', 'ご注文は', 'ごちゅうもん'] },
  omatase: { k: 'お待たせしました', r: 'おまたせしました', ro: 'omatase shimashita', m: ['Sorry to keep you waiting.', '让您久等了。'], say: ['おまたせしました', 'お待たせしました', 'お待たせいたしました', 'おまたせ'] },
  arigatou: { k: 'ありがとうございました', ro: 'arigatō gozaimashita', m: ['Thank you very much!', '谢谢光临！'], say: ['ありがとうございました', 'ありがとうございます', 'ありがとう'] },
};
export const LINE_IDS = Object.keys(PHRASES);
export const COUNT = ['', 'ひとりです', 'ふたりです', 'さんにんです', 'よにんです'];
