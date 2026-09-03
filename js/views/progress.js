// Per-exercise best-set chart and bodyweight trend.
import { db, getSetting } from '../db.js';
import { h, clear, toast, confirm, setTitle, numVal, fmtNum, fmtShort, fmtDate, todayKey } from '../ui.js';
import { lineChart } from '../chart.js';
import { icon } from '../icons.js';

const state = { exercise: null };
const norm = (s) => s.trim().toLowerCase();

export async function render(root) {
  setTitle('Progress');
  const unit = await getSetting('weightUnit');
  const sessions = await db.sessions.orderBy('time').toArray();

  // ----- Exercise chart -----
  const names = new Map(); // key -> display name
  for (const s of sessions) for (const e of s.exercises) if (!names.has(norm(e.name))) names.set(norm(e.name), e.name);
  const keys = [...names.keys()].sort((a, b) => names.get(a).localeCompare(names.get(b)));
  if (!state.exercise || !names.has(state.exercise)) state.exercise = keys[0] || null;

  const chartBox = h('div');
  const select = h('select', { onchange: (e) => { state.exercise = e.target.value; drawChart(); } },
    keys.map((k) => h('option', { value: k, selected: k === state.exercise }, names.get(k))));

  root.append(
    h('div', { class: 'card' },
      h('span', { class: 'eyebrow' }, 'Exercise progress'),
      keys.length
        ? [h('label', { class: 'field' }, h('span', {}, 'Exercise'), select), chartBox]
        : h('p', { class: 'muted' }, 'Log a workout to see progress here.'),
    ),
  );

  function drawChart() {
    clear(chartBox);
    const points = [];
    for (const s of sessions) {
      const ex = s.exercises.find((e) => norm(e.name) === state.exercise);
      if (!ex || !ex.sets.length) continue;
      const best = ex.sets.reduce((b, x) => (!b || x.weight > b.weight || (x.weight === b.weight && x.reps > b.reps) ? x : b), null);
      points.push({ label: fmtShort(s.date), value: best.weight, reps: best.reps, date: s.date });
    }
    const pr = points.reduce((b, p) => (!b || p.value > b.value ? p : b), null);
    chartBox.append(
      h('p', { class: 'muted small' }, `Best set weight (${unit}) per session · ${points.length} session${points.length === 1 ? '' : 's'}`),
      lineChart(points, { unit: ` ${unit}` }),
      pr ? h('p', { class: 'small' }, h('strong', {}, 'All-time best: '), `${fmtNum(pr.value)} ${unit} × ${pr.reps} on ${fmtShort(pr.date)}`) : null,
      h('ul', { class: 'list' }, points.slice(-5).reverse().map((p) =>
        h('li', {}, h('div', { class: 'grow' }, fmtDate(p.date)), h('span', { class: 'num' }, `${fmtNum(p.value)} ${unit} × ${p.reps}`)))),
    );
  }
  if (keys.length) drawChart();

  // ----- Bodyweight -----
  const today = todayKey();
  const entries = await db.bodyweight.orderBy('date').toArray();
  const todays = entries.find((e) => e.date === today);
  const dateIn = h('input', { type: 'date', value: today, max: today });
  const weightIn = h('input', { type: 'text', inputmode: 'decimal', placeholder: todays ? fmtNum(todays.weight) : `Weight (${unit})` });

  root.append(
    h('form', { class: 'card', onsubmit: async (e) => {
      e.preventDefault();
      const w = numVal(weightIn);
      if (w == null || !dateIn.value) { toast('Enter a weight'); return; }
      await db.bodyweight.put({ date: dateIn.value, weight: w });
      toast('Bodyweight saved');
      clear(root); render(root);
    } },
      h('span', { class: 'eyebrow' }, 'Bodyweight'),
      h('div', { class: 'row' },
        h('label', { class: 'field', style: 'flex:1' }, h('span', {}, 'Date'), dateIn),
        h('label', { class: 'field', style: 'flex:1' }, h('span', {}, `Weight (${unit})`), weightIn),
      ),
      h('button', { class: 'btn primary block', type: 'submit' }, todays ? 'Update today' : 'Save'),
    ),
  );

  if (entries.length) {
    const first = entries[0].weight;
    const lastW = entries[entries.length - 1].weight;
    const delta = lastW - first;
    root.append(
      h('div', { class: 'card' },
        h('div', { class: 'card-head' }, h('span', { class: 'eyebrow', style: 'margin:0' }, 'Trend'), h('span', { style: 'flex:1' }),
          h('span', { class: 'muted small' }, `${delta >= 0 ? '+' : ''}${fmtNum(delta)} ${unit} since ${fmtShort(entries[0].date)}`)),
        lineChart(entries.map((e) => ({ label: fmtShort(e.date), value: e.weight })), { unit: ` ${unit}` }),
        h('ul', { class: 'list' }, entries.slice(-7).reverse().map((e) => h('li', {},
          h('div', { class: 'grow' }, fmtDate(e.date)),
          h('span', { class: 'num' }, `${fmtNum(e.weight)} ${unit}`),
          h('button', { class: 'btn icon ghost danger', 'aria-label': 'Delete', onclick: async () => {
            if (!confirm(`Delete bodyweight for ${fmtDate(e.date)}?`)) return;
            await db.bodyweight.delete(e.date);
            clear(root); render(root);
          } }, icon('x', 18)),
        ))),
      ),
    );
  }
}
