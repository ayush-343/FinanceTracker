import { format, parseISO } from 'date-fns';
import { AskResult } from './execute';

export const FORECAST_INSUFFICIENT = 'Forecast appears after 3 weeks of history.';

const OVER_BUDGET_PCT = 80;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' ');

/** The deterministic answer sentence. Always correct; the model may only rephrase it under guardSentence. */
export const templateSentence = (result: AskResult, money: (n: number) => string, subject?: string): string => {
  switch (result.kind) {
    case 'total':
      return result.value === 0
        ? `${join("You didn't spend anything", subject, result.label)}.`
        : `${join('You spent', money(result.value), subject, result.label)} across ${plural(result.count, 'purchase', 'purchases')}.`;
    case 'breakdown': {
      const top = result.rows[0];
      if (!top) return `No spending ${result.label}.`;
      return `${top.label} was your biggest at ${money(top.value)} of ${money(result.total)} ${result.label}.`;
    }
    case 'compare': {
      const head = `${money(result.b.value)} ${result.b.label} vs ${money(result.a.value)} ${result.a.label}`;
      if (result.diff === 0) return `${head} — the same.`;
      if (result.pct == null) return `${head}.`;
      return `${head} — ${Math.round(Math.abs(result.pct))}% ${result.diff > 0 ? 'more' : 'less'}.`;
    }
    case 'list':
      return result.rows.length === 0
        ? `No purchases found ${result.label}.`
        : `Here ${result.rows.length === 1 ? 'is' : 'are'} ${plural(result.rows.length, 'purchase', 'purchases')} from ${result.label}.`;
    case 'budget': {
      if (result.rows.length === 0) return "You haven't set any category budgets yet.";
      const over = result.rows.filter((r) => r.pct >= OVER_BUDGET_PCT).length;
      return `${over} of ${plural(result.rows.length, 'budget', 'budgets')} ${over === 1 ? 'is' : 'are'} over ${OVER_BUDGET_PCT}% ${result.label}.`;
    }
    case 'forecast': {
      const f = result.forecast;
      if (f.status === 'insufficient') return FORECAST_INSUFFICIENT;
      const head = `You're on pace for ${money(f.total.low)}–${money(f.total.high)} ${result.label} (likely ${money(f.total.likely)}).`;
      const risk = f.categories.find((c) => c.overOn);
      return risk
        ? `${head} ${risk.name} may go over budget around ${format(parseISO(risk.overOn!), 'd MMM')}.`
        : `${head} All categories look on track.`;
    }
    case 'unsupported':
      return result.reason;
  }
};

const numbersIn = (text: string): number[] => (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((s) => Number(s.replace(/,/g, '')));

/** Every number a correct sentence about this result could contain. */
export const allowedNumbers = (result: AskResult): Set<number> => {
  const raw: number[] = [];
  const labels: string[] = [];
  switch (result.kind) {
    case 'total': raw.push(result.value, result.count); labels.push(result.label); break;
    case 'breakdown': raw.push(result.total, result.rows.length); result.rows.forEach((r) => { raw.push(r.value); labels.push(r.label); }); labels.push(result.label); break;
    case 'compare': raw.push(result.a.value, result.b.value, result.diff); if (result.pct != null) raw.push(result.pct); labels.push(result.a.label, result.b.label); break;
    case 'list': raw.push(result.rows.length); result.rows.forEach((r) => { raw.push(r.amount); labels.push(r.label, r.date); }); labels.push(result.label); break;
    case 'budget': raw.push(result.rows.length, OVER_BUDGET_PCT); result.rows.forEach((r) => raw.push(r.spent, r.limit, r.pct)); labels.push(result.label); break;
    case 'forecast':
      if (result.forecast.status === 'ok') {
        const t = result.forecast.total;
        raw.push(t.spent, t.likely, t.low, t.high, t.budget);
        result.forecast.categories.forEach((c) => { raw.push(c.spent, c.likely, c.low, c.high, c.budget); if (c.overOn) labels.push(c.overOn); });
      }
      raw.push(3);
      break;
    case 'unsupported': break;
  }
  const out = new Set<number>();
  for (const n of [...raw, ...labels.flatMap(numbersIn)]) {
    for (const v of [n, Math.abs(n), Math.round(n), Math.round(Math.abs(n))]) out.add(Math.round(v * 100) / 100);
  }
  return out;
};

/** True only if every number in the sentence is one the result supports. */
export const guardSentence = (sentence: string, result: AskResult): boolean => {
  const allowed = allowedNumbers(result);
  return numbersIn(sentence).every((n) => allowed.has(Math.round(n * 100) / 100));
};

export const buildNarrationPrompt = (question: string, template: string): { system: string; prompt: string } => ({
  system: 'Rewrite the given answer as one short, friendly sentence. Keep every number exactly as written. Do not add any new numbers, estimates or advice.',
  prompt: `Question: ${question}\nAnswer: ${template}`,
});
