// one message to the other station: on this phone (しばBot) or across the link
import { G } from '../game/G';
import { botCookHear } from '../game/bot';
import { cRecv } from '../game/counter';
import { kRecv } from '../game/kitchen';
import { netSend } from './online';

export function toCook(m) {
  if (G.ROLE === 'cook' || G.MODE === 'bot') kRecv(m);
  if (G.MODE === 'net' && G.ROLE === 'counter') netSend(m);
}
export function toCounter(m) {
  if (G.ROLE === 'counter' || G.MODE === 'bot') cRecv(m);
  if (G.MODE === 'net' && G.ROLE === 'cook') netSend(m);
}
// in practice, しばBot hears every message for its station
export function botHear(m) {
  if (G.MODE !== 'bot') return;
  if (G.ROLE === 'counter') botCookHear(m);
}
