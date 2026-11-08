// Nights that build up, and the line abilities.
// A run is Night 1, 2, 3…: each night is a little longer and busier, with new dishes and guests. Clear a night (at least
// one star, fewer than three walkouts) and pick one upgrade from three; a night without a star ends the run.
// Abilities are the Japanese lines as power moves (Brawl Stars style): each waiter has two (a third from an upgrade),
// each on a cooldown. Tap to use it; say it into the mic for a stronger one (声ボーナス).
import { SHIFT, COOK, type Dish } from './data';

// ---------- abilities ----------
export type AbId = 'rally' | 'freeze' | 'dash' | 'thanks';
export const ABIL: Record<AbId, { line: string; icon: string; short: string; cd: number; en: string; zh: string }> = {
  rally: { line: 'irasshai', icon: '📣', short: 'いらっしゃい', cd: 30, en: 'Everyone waiting cheers up; the group at the door is ready to be seated', zh: '排队的客人都开心起来；门口那组直接可以带位' },
  freeze: { line: 'shoushou', icon: '⏸', short: 'しょうしょう', cd: 26, en: 'Nobody loses patience for 6 seconds', zh: '6 秒内所有客人不掉耐心' },
  dash: { line: 'omatase', icon: '💨', short: 'おまたせ', cd: 16, en: 'Run 60% faster for 5 seconds', zh: '5 秒内跑快 60%' },
  thanks: { line: 'arigatou', icon: '🙏', short: 'ありがとう', cd: 34, en: 'Guests who have eaten pay up and leave happy, with a bigger tip', zh: '吃完的客人马上结账开心离开，小费更多' },
};
/** the abilities a waiter has: navy (0) runs the front of the house, green (1) the floor; an upgrade adds a third */
export function kit(pi: number, ups: Ups): AbId[] {
  const k: AbId[] = pi === 0 ? ['rally', 'freeze'] : ['dash', 'thanks'];
  if (ups.third) k.push(pi === 0 ? 'dash' : 'freeze');
  return k;
}
export const VOICE = 1.5; // saying the line makes it this much stronger

// ---------- upgrades ----------
export type Ups = Record<string, number>;
export const UPS: Record<string, { icon: string; en: string; zh: string; max: number }> = {
  shoes: { icon: '👟', en: 'Fast shoes: run 12% faster', zh: '快跑鞋：跑快 12%', max: 3 },
  calm: { icon: '🍵', en: 'Free tea: guests lose patience 15% slower', zh: '免费茶：客人耐心掉得慢 15%', max: 3 },
  boil: { icon: '🔥', en: 'Strong burners: noodles are ready a second sooner', zh: '大火：面早一秒煮好', max: 2 },
  tips: { icon: '🪙', en: 'Tip jar: tips +25%', zh: '小费罐：小费 +25%', max: 3 },
  cool: { icon: '⏱', en: 'Warm-up: abilities come back 20% sooner', zh: '热身：技能冷却快 20%', max: 2 },
  combo: { icon: '🔗', en: 'Steady hands: one mistake keeps your combo', zh: '稳手：失误一次不断连击', max: 1 },
  third: { icon: '✨', en: 'A third line ability', zh: '第三个台词技能', max: 1 },
};
/** three different upgrades you can still take */
export function offer(ups: Ups, seed = Math.random()): string[] {
  const open = Object.keys(UPS).filter(k => (ups[k] || 0) < UPS[k].max);
  const out: string[] = []; let s = Math.floor(seed * 9973);
  while (out.length < 3 && open.length) { s = (s * 31 + 7) % 9973; out.push(open.splice(s % open.length, 1)[0]); }
  return out;
}

// ---------- nights ----------
export const NIGHT = { n: 1, dishes: ['tamago', 'negi'] as Dish[], sizes: [1, 2], critic: 0, vip: 0, spawn: 13, rushSpawn: 7, drain: 1, two: 0 };
export const RUN = { night: 1, ups: {} as Ups };
const BASE_COOK = { ...COOK };
/** set the shift up for night n with these upgrades (both phones do this, so the clock and stars match) */
export function applyNight(n: number, ups: Ups) {
  const k = Math.min(n, 6);
  SHIFT.len = 120 + 15 * Math.min(4, k - 1);           // 2:00 → 3:00
  SHIFT.rush = SHIFT.len - 50;
  const scale = (1 + 0.3 * (k - 1)) * (SHIFT.len / 120);
  SHIFT.stars = [1200, 2600, 4200].map(s => Math.round((s * scale) / 100) * 100);
  Object.assign(NIGHT, {
    n,
    dishes: n === 1 ? ['tamago', 'negi'] : ['tamago', 'negi', 'naruto'],
    sizes: n === 1 ? [1, 2] : n === 2 ? [1, 2, 2, 3] : [1, 2, 2, 3, 3, 4],
    critic: n >= 2 ? SHIFT.len * 0.4 : 0,
    vip: n >= 3 ? SHIFT.len * 0.7 : 0,
    spawn: Math.max(8.5, 14 - k), rushSpawn: Math.max(4.5, 7.5 - k * 0.4),
    drain: (1 + 0.08 * (k - 1)) * (1 - 0.15 * (ups.calm || 0)),
    two: n >= 4 ? 0.25 : 0,
  });
  COOK.ready = BASE_COOK.ready - (ups.boil || 0); COOK.soft = BASE_COOK.soft; COOK.burnt = BASE_COOK.burnt;
}
applyNight(1, {});
