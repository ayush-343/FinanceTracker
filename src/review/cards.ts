import { format, parseISO } from 'date-fns';
import type { Forecast } from '../ai/forecast/forecast';

export interface ReviewInput {
  weekLabel: string;
  drawn: number;
  elapsed: number;
  weekSpent: number;
  usualWeek: number | null;
  top: { id: number; name: string; spent: number; usual: number } | null;
  forecast: Forecast;
  periodLabel: string;
  upcoming: { name: string; date: string; amount: number }[];
  goalCount: number;
}

export interface ReviewCard {
  kind: 'week' | 'change' | 'forecast' | 'upcoming' | 'action';
  title: string;
  body: string;
  action?: { label: string; route: string; params?: Record<string, string> };
}

const NOTABLE = 0.1;
const pct = (now: number, usual: number) => Math.round((now / usual - 1) * 100);

/** The Sunday review, as an ordered list of cards. Encouraging, never shaming; every figure comes from the input. */
export const reviewCards = (i: ReviewInput, money: (n: number) => string): ReviewCard[] => {
  const cards: ReviewCard[] = [];
  const quiet = i.elapsed - i.drawn;
  cards.push({
    kind: 'week',
    title: `${i.drawn} of ${i.elapsed} ${i.elapsed === 1 ? 'day' : 'days'} drawn`,
    body: quiet === 0 ? 'You logged every day this week.' : `${quiet} ${quiet === 1 ? 'day stayed a dot' : 'days stayed dots'}. The pattern kept going.`,
  });

  const topUp = i.top && i.top.usual > 0 && i.top.spent >= i.top.usual * (1 + NOTABLE);
  if (i.weekSpent === 0) {
    cards.push({ kind: 'change', title: 'A quiet week', body: 'Nothing spent this week so far.' });
  } else if (topUp && i.top) {
    cards.push({
      kind: 'change',
      title: `${i.top.name} came in ${pct(i.top.spent, i.top.usual)}% above your usual week`,
      body: `${money(i.top.spent)} this week against a usual ${money(i.top.usual)}.`,
    });
  } else if (i.usualWeek && i.usualWeek > 0) {
    const change = pct(i.weekSpent, i.usualWeek);
    cards.push({
      kind: 'change',
      title: change <= -NOTABLE * 100 ? 'Lighter than a usual week' : change >= NOTABLE * 100 ? `${change}% above a usual week` : 'A steady week',
      body: `${money(i.weekSpent)} this week against a usual ${money(i.usualWeek)}.`,
    });
  }

  if (i.forecast.status === 'ok') {
    const t = i.forecast.total;
    cards.push({
      kind: 'forecast',
      title: `On pace for ${money(t.low)}–${money(t.high)} ${i.periodLabel}`,
      body: `likely ${money(t.likely)}${t.budget > 0 ? ` of your ${money(t.budget)} budget` : ''}.`,
    });
  }

  if (i.upcoming.length) {
    cards.push({
      kind: 'upcoming',
      title: 'Coming up',
      body: i.upcoming.map((u) => `${u.name} ${money(u.amount)} on ${format(parseISO(u.date), 'EEE d MMM')}`).join('\n'),
    });
  }

  const action: ReviewCard['action'] = topUp && i.top
    ? { label: `Set a ${i.top.name} limit`, route: '/EditCategory', params: { categoryId: String(i.top.id) } }
    : i.goalCount === 0
      ? { label: 'Start a savings goal', route: '/Goal' }
      : { label: 'Look at your goals', route: '/(tabs)/Plan' };
  cards.push({ kind: 'action', title: 'One thing for next week', body: 'See you next Sunday.', action });
  return cards;
};
