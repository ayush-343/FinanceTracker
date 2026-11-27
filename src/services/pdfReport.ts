import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { getCategoriesWithSpending, getTransactions } from '../database';
import { feedLabel } from '../activity/feed';
import { hueMap } from '../ui/bandMath';

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));

/** A one-month spending report in the Daily Kolam palette, shared through the system share sheet. */
export const exportMonthReport = async (money: (n: number) => string, month = new Date()): Promise<void> => {
  const from = format(startOfMonth(month), 'yyyy-MM-dd');
  const to = format(endOfMonth(month), 'yyyy-MM-dd');
  const [cats, txs] = await Promise.all([getCategoriesWithSpending(from, to), getTransactions(from, to)]);
  const hues = hueMap(cats.map((c) => c.id));
  const spent = cats.reduce((s, c) => s + c.spent, 0);
  const budget = cats.reduce((s, c) => s + c.budget_limit, 0);
  const rows = cats.filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent).map((c) => `
    <tr><td><span class="dot" style="background:${hues.get(c.id)}"></span>${esc(c.name)}</td>
    <td class="n">${money(c.spent)}</td><td class="n">${c.budget_limit > 0 ? money(c.budget_limit) : '—'}</td>
    <td class="n">${spent > 0 ? Math.round((c.spent / spent) * 100) : 0}%</td></tr>`).join('');
  const bands = cats.filter((c) => c.spent > 0).map((c) => `<span style="width:${(c.spent / Math.max(spent, 1)) * 100}%;background:${hues.get(c.id)}"></span>`).join('');
  const list = [...txs].sort((a, b) => b.date.localeCompare(a.date)).map((t) => `
    <tr><td>${format(new Date(`${t.date}T00:00:00`), 'd MMM')}</td><td>${esc(feedLabel(t))}</td><td>${esc(t.category_name)}</td><td class="n">${money(t.amount)}</td></tr>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,sans-serif;color:#1E2A25;padding:36px;background:#fff}
    h1{font-size:28px;margin:0}.sub{color:#5B6A63;margin:4px 0 24px}
    .field{background:#1E2A25;color:#F4EFE6;border-radius:16px;padding:20px}
    .big{font-size:30px;font-weight:700;margin-top:4px}.muted{color:#B9C4BE}
    .bands{display:flex;height:12px;border-radius:6px;overflow:hidden;background:#33433B;margin-top:14px}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
    td,th{padding:8px 4px;border-bottom:1px solid #D5DCD4;text-align:left}th{color:#5B6A63;font-weight:600}
    .n{text-align:right;font-variant-numeric:tabular-nums}.dot{display:inline-block;width:9px;height:9px;border-radius:5px;margin-right:8px}
    h2{font-size:16px;margin:28px 0 0}
  </style></head><body>
    <h1>${format(month, 'MMMM yyyy')}</h1><p class="sub">Spending report · ${format(new Date(), 'd MMM yyyy')}</p>
    <div class="field"><div class="muted">Spent</div><div class="big">${money(spent)}</div>
      <div class="muted">${budget > 0 ? `of a ${money(budget)} budget` : 'no budget set'} · ${txs.length} purchases</div>
      <div class="bands">${bands}</div></div>
    <h2>By category</h2><table><tr><th>Category</th><th class="n">Spent</th><th class="n">Budget</th><th class="n">Share</th></tr>${rows}</table>
    <h2>Purchases</h2><table><tr><th>Date</th><th>What</th><th>Category</th><th class="n">Amount</th></tr>${list}</table>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${format(month, 'MMMM yyyy')} report`, UTI: 'com.adobe.pdf' });
};
