// Food logging: today, day-by-day history, weekly summary, food library.
import { db, getAllSettings } from '../db.js';
import {
  h, clear, toast, confirm, setTitle, segments, numVal, fmtNum,
  todayKey, addDays, fmtDate, fmtShort, weekStart,
} from '../ui.js';

const state = { tab: 'today', date: todayKey() };
const norm = (s) => s.trim().toLowerCase();

export async function render(root) {
  setTitle('Food');
  const settings = await getAllSettings();
  root.append(segments(
    [['today', 'Today'], ['history', 'History'], ['week', 'Weekly'], ['foods', 'My foods']],
    state.tab,
    (key) => { state.tab = key; clear(root); render(root); },
  ));
  const body = h('div');
  root.append(body);
  const redraw = () => { clear(root); render(root); };
  if (state.tab === 'today') await renderDay(body, settings, redraw);
  else if (state.tab === 'history') await renderHistory(body, settings);
  else if (state.tab === 'week') await renderWeekly(body, settings);
  else await renderFoods(body, redraw);
}

// ---------- shared pieces ----------

function totals(entries) {
  return entries.reduce((t, e) => ({ calories: t.calories + (e.calories || 0), protein: t.protein + (e.protein || 0) }),
    { calories: 0, protein: 0 });
}

function progressBar(label, value, target, unit) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const cls = value >= target && target > 0 ? 'good' : '';
  return h('div', { style: 'margin-bottom:12px' },
    h('div', { class: 'stat' },
      h('span', {}, label),
      h('span', {}, h('strong', {}, fmtNum(value, 0)), h('span', { class: 'muted' }, ` / ${fmtNum(target, 0)} ${unit}`)),
    ),
    h('div', { class: 'bar' }, h('div', { class: cls, style: `width:${pct}%` })),
    h('div', { class: 'muted small' }, value >= target ? `Target hit (+${fmtNum(value - target, 0)})` : `${fmtNum(target - value, 0)} ${unit} to go`),
  );
}

/** Insert an entry and remember the food in the library. */
async function addEntry(date, name, calories, protein) {
  await db.foodEntries.add({ date, name, calories, protein, time: Date.now() });
  const key = norm(name);
  const existing = await db.foods.where('key').equals(key).first();
  if (existing) {
    await db.foods.update(existing.id, { name, calories, protein, lastUsed: Date.now(), useCount: (existing.useCount || 0) + 1 });
  } else {
    await db.foods.add({ key, name, calories, protein, lastUsed: Date.now(), useCount: 1 });
  }
}

// ---------- Today (or any chosen day) ----------

async function renderDay(root, settings, redraw) {
  const date = state.date;
  const entries = await db.foodEntries.where('date').equals(date).sortBy('time');
  const t = totals(entries);
  const recent = await db.foods.orderBy('lastUsed').reverse().limit(12).toArray();

  // Date navigation
  root.append(
    h('div', { class: 'day-nav' },
      h('button', { class: 'btn icon', onclick: () => { state.date = addDays(date, -1); redraw(); } }, '‹'),
      h('div', { class: 'title' }, h('strong', {}, fmtDate(date)),
        date !== todayKey() ? h('a', { href: '#', class: 'small', onclick: (e) => { e.preventDefault(); state.date = todayKey(); redraw(); } }, 'Back to today') : null),
      h('button', { class: 'btn icon', disabled: date >= todayKey(), onclick: () => { state.date = addDays(date, 1); redraw(); } }, '›'),
    ),
    h('div', { class: 'card' },
      progressBar('Calories', t.calories, settings.calorieTarget, 'kcal'),
      progressBar('Protein', t.protein, settings.proteinTarget, 'g'),
    ),
  );

  // Quick add form
  const nameIn = h('input', { type: 'text', placeholder: 'Food name', autocomplete: 'off', autocapitalize: 'sentences' });
  const calIn = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'kcal' });
  const proIn = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'g' });
  const submit = async (e) => {
    e.preventDefault();
    const name = nameIn.value.trim();
    const calories = numVal(calIn);
    const protein = numVal(proIn) ?? 0;
    if (!name || calories == null) { toast('Enter a name and calories'); return; }
    await addEntry(date, name, calories, protein);
    toast(`Added ${name}`);
    redraw();
  };
  root.append(
    h('form', { class: 'card', onsubmit: submit },
      h('h3', { style: 'margin-bottom:8px' }, 'Quick add'),
      h('label', { class: 'field' }, h('span', {}, 'Food'), nameIn),
      h('div', { class: 'row' },
        h('label', { class: 'field', style: 'flex:1' }, h('span', {}, 'Calories'), calIn),
        h('label', { class: 'field', style: 'flex:1' }, h('span', {}, 'Protein (g)'), proIn),
      ),
      h('button', { class: 'btn primary block', type: 'submit' }, 'Add entry'),
    ),
  );

  // Recent foods as one-tap chips
  if (recent.length) {
    root.append(
      h('div', { class: 'card' },
        h('h3', { style: 'margin-bottom:8px' }, 'Recent foods'),
        h('div', { class: 'chips' },
          recent.map((f) => h('button', { class: 'chip', type: 'button', onclick: async () => {
            await addEntry(date, f.name, f.calories, f.protein);
            toast(`Added ${f.name}`);
            redraw();
          } }, f.name, ' ', h('span', { class: 'muted' }, `${fmtNum(f.calories, 0)} kcal · ${fmtNum(f.protein)}g`))),
        ),
      ),
    );
  }

  // Entries for the day
  root.append(
    h('div', { class: 'card' },
      h('h3', { style: 'margin-bottom:4px' }, `Entries (${entries.length})`),
      entries.length
        ? h('ul', { class: 'list' }, entries.map((e) => h('li', {},
          h('div', { class: 'grow' }, h('div', { class: 'title' }, e.name),
            h('div', { class: 'sub' }, `${fmtNum(e.calories, 0)} kcal · ${fmtNum(e.protein)} g protein`)),
          h('button', { class: 'btn icon ghost danger', 'aria-label': 'Delete entry', onclick: async () => {
            await db.foodEntries.delete(e.id);
            redraw();
          } }, '×'),
        )))
        : h('p', { class: 'muted' }, 'Nothing logged yet.'),
    ),
  );
}

// ---------- History ----------

async function renderHistory(root, settings) {
  const entries = await db.foodEntries.orderBy('date').reverse().toArray();
  if (!entries.length) { root.append(h('div', { class: 'empty' }, 'No food logged yet.')); return; }

  const byDay = new Map();
  for (const e of entries) {
    if (!byDay.has(e.date)) byDay.set(e.date, []);
    byDay.get(e.date).push(e);
  }

  for (const [date, list] of byDay) {
    const t = totals(list);
    const hit = t.protein >= settings.proteinTarget;
    const body = h('div', { class: 'session-body hidden' },
      h('ul', { class: 'list' }, list.map((e) => h('li', {},
        h('div', { class: 'grow' }, e.name),
        h('span', { class: 'num muted' }, `${fmtNum(e.calories, 0)} kcal · ${fmtNum(e.protein)}g`),
      ))),
    );
    root.append(
      h('div', { class: 'card session', onclick: () => body.classList.toggle('hidden') },
        h('div', { class: 'row' },
          h('div', { class: 'grow' },
            h('div', { class: 'title' }, fmtDate(date)),
            h('div', { class: 'sub' }, `${fmtNum(t.calories, 0)} kcal · ${fmtNum(t.protein)} g protein ${hit ? '✅' : ''}`),
          ),
          h('span', { class: 'muted' }, '▾'),
        ),
        body,
      ),
    );
  }
}

// ---------- Weekly summary ----------

async function renderWeekly(root, settings) {
  const entries = await db.foodEntries.toArray();
  if (!entries.length) { root.append(h('div', { class: 'empty' }, 'No food logged yet.')); return; }

  const dayTotals = new Map();
  for (const e of entries) {
    const t = dayTotals.get(e.date) || { calories: 0, protein: 0 };
    t.calories += e.calories || 0;
    t.protein += e.protein || 0;
    dayTotals.set(e.date, t);
  }

  const summarize = (dates) => {
    const days = dates.filter((d) => dayTotals.has(d));
    const n = days.length;
    const sum = days.reduce((a, d) => ({ c: a.c + dayTotals.get(d).calories, p: a.p + dayTotals.get(d).protein }), { c: 0, p: 0 });
    const hits = days.filter((d) => dayTotals.get(d).protein >= settings.proteinTarget).length;
    return { n, avgCal: n ? sum.c / n : 0, avgPro: n ? sum.p / n : 0, hits };
  };

  const card = (title, sub, s) => h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h3', {}, title), h('span', { class: 'muted small' }, sub)),
    h('div', { class: 'summary-grid' },
      h('div', { class: 'cell' }, h('strong', {}, fmtNum(s.avgCal, 0)), h('span', {}, 'avg kcal')),
      h('div', { class: 'cell' }, h('strong', {}, fmtNum(s.avgPro, 0)), h('span', {}, 'avg protein g')),
      h('div', { class: 'cell' }, h('strong', {}, `${s.hits}/${s.n}`), h('span', {}, 'protein days hit')),
    ),
  );

  // Rolling last 7 days
  const today = todayKey();
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  root.append(card('Last 7 days', `${fmtShort(last7[6])} – ${fmtShort(today)}`, summarize(last7)));

  // Calendar weeks (Mon–Sun), newest first, only weeks with data
  const weeks = new Map();
  for (const d of dayTotals.keys()) {
    const ws = weekStart(d);
    if (!weeks.has(ws)) weeks.set(ws, Array.from({ length: 7 }, (_, i) => addDays(ws, i)));
  }
  const ordered = [...weeks.keys()].sort().reverse();
  root.append(h('h2', { style: 'margin:16px 0 8px' }, 'By week'));
  ordered.forEach((ws) => {
    root.append(card(`Week of ${fmtShort(ws)}`, `${fmtShort(ws)} – ${fmtShort(addDays(ws, 6))}`, summarize(weeks.get(ws))));
  });
}

// ---------- Food library ----------

async function renderFoods(root, redraw) {
  const foods = await db.foods.orderBy('lastUsed').reverse().toArray();

  const nameIn = h('input', { type: 'text', placeholder: 'Food name', autocomplete: 'off' });
  const calIn = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'kcal' });
  const proIn = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'g' });
  root.append(
    h('form', { class: 'card', onsubmit: async (e) => {
      e.preventDefault();
      const name = nameIn.value.trim();
      const calories = numVal(calIn);
      const protein = numVal(proIn) ?? 0;
      if (!name || calories == null) { toast('Enter a name and calories'); return; }
      const key = norm(name);
      const existing = await db.foods.where('key').equals(key).first();
      if (existing) await db.foods.update(existing.id, { name, calories, protein });
      else await db.foods.add({ key, name, calories, protein, lastUsed: Date.now(), useCount: 0 });
      toast('Food saved');
      redraw();
    } },
      h('h3', { style: 'margin-bottom:8px' }, 'Save a custom food'),
      h('label', { class: 'field' }, h('span', {}, 'Food'), nameIn),
      h('div', { class: 'row' },
        h('label', { class: 'field', style: 'flex:1' }, h('span', {}, 'Calories'), calIn),
        h('label', { class: 'field', style: 'flex:1' }, h('span', {}, 'Protein (g)'), proIn),
      ),
      h('button', { class: 'btn primary block', type: 'submit' }, 'Save food'),
    ),
    h('div', { class: 'card' },
      h('h3', { style: 'margin-bottom:4px' }, `Saved foods (${foods.length})`),
      h('p', { class: 'muted small' }, 'Anything you log is saved here automatically. The 12 most recent show as one-tap buttons on Today.'),
      foods.length
        ? h('ul', { class: 'list' }, foods.map((f) => h('li', {},
          h('div', { class: 'grow' }, h('div', { class: 'title' }, f.name),
            h('div', { class: 'sub' }, `${fmtNum(f.calories, 0)} kcal · ${fmtNum(f.protein)} g protein · used ${f.useCount || 0}×`)),
          h('button', { class: 'btn icon ghost danger', 'aria-label': 'Delete food', onclick: async () => {
            if (!confirm(`Remove "${f.name}" from saved foods?`)) return;
            await db.foods.delete(f.id);
            redraw();
          } }, '×'),
        )))
        : h('p', { class: 'muted' }, 'No saved foods yet.'),
    ),
  );
}
