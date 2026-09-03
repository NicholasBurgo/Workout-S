// Workout logging view: today's day of the split, sets with last-session placeholders.
import { db, getProgram, getSetting, setSetting } from '../db.js';
import { h, clear, toast, setTitle, fmtNum, fmtShort, todayKey } from '../ui.js';
import { icon } from '../icons.js';

const draftKey = (dayIndex) => `draft:${dayIndex}`;
const norm = (name) => name.trim().toLowerCase();

/** For each exercise name, find the most recent session that contains it. */
async function lastPerformance(names) {
  const sessions = await db.sessions.orderBy('time').reverse().toArray();
  const out = {};
  for (const name of names) {
    const key = norm(name);
    for (const s of sessions) {
      const ex = s.exercises.find((e) => norm(e.name) === key);
      if (ex && ex.sets.length) { out[key] = { date: s.date, sets: ex.sets }; break; }
    }
  }
  return out;
}

function loadDraft(dayIndex, day) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(draftKey(dayIndex)) || '{}'); } catch { saved = {}; }
  // Draft is keyed by exercise name so program edits don't corrupt it.
  return day.exercises.map((ex) => ({
    name: ex.name,
    target: `${ex.sets} × ${ex.reps}`,
    sets: Array.isArray(saved[ex.name]) && saved[ex.name].length
      ? saved[ex.name]
      : Array.from({ length: ex.sets }, () => ({ weight: '', reps: '' })),
  }));
}

function storeDraft(dayIndex, draft) {
  const obj = {};
  draft.forEach((ex) => { obj[ex.name] = ex.sets; });
  localStorage.setItem(draftKey(dayIndex), JSON.stringify(obj));
}

export async function render(root) {
  setTitle('Workout');
  const days = await getProgram();
  let dayIndex = await getSetting('currentDay');
  if (!days.length) {
    root.append(h('div', { class: 'empty' }, 'Your program has no days. ', h('a', { href: '#/program' }, 'Edit program')));
    return;
  }
  if (dayIndex >= days.length) dayIndex = 0;
  const unit = await getSetting('weightUnit');
  const day = days[dayIndex];
  const last = await lastPerformance(day.exercises.map((e) => e.name));
  const draft = loadDraft(dayIndex, day);

  const goToDay = async (i) => {
    await setSetting('currentDay', (i + days.length) % days.length);
    clear(root);
    render(root);
  };

  root.append(
    h('div', { class: 'day-nav' },
      h('button', { class: 'btn icon', onclick: () => goToDay(dayIndex - 1), 'aria-label': 'Previous day' }, icon('chevron-left')),
      h('div', { class: 'title' },
        h('strong', {}, `Day ${dayIndex + 1} of ${days.length}`),
        h('span', { class: 'muted' }, day.name)),
      h('button', { class: 'btn icon', onclick: () => goToDay(dayIndex + 1), 'aria-label': 'Next day' }, icon('chevron-right')),
    ),
  );

  const exerciseCards = draft.map((ex) => exerciseCard(ex, last[norm(ex.name)], unit, () => storeDraft(dayIndex, draft)));
  root.append(...exerciseCards);

  root.append(
    h('button', { class: 'btn primary block', onclick: save }, 'Save session'),
    h('p', { class: 'footnote' }, 'Leave weight blank to reuse last time\'s weight. Sets without reps are ignored.'),
    h('p', { class: 'center mt' }, h('a', { href: '#/program' }, 'Edit program')),
  );

  async function save() {
    const exercises = [];
    draft.forEach((ex) => {
      const ref = last[norm(ex.name)];
      const sets = [];
      ex.sets.forEach((s, i) => {
        const reps = toNum(s.reps);
        if (reps == null) return;
        const weight = toNum(s.weight) ?? refSet(ref, i)?.weight ?? 0;
        sets.push({ weight, reps });
      });
      if (sets.length) exercises.push({ name: ex.name, target: ex.target, sets });
    });
    if (!exercises.length) { toast('Nothing to save yet. Enter some reps first.'); return; }

    await db.sessions.add({
      date: todayKey(),
      time: Date.now(),
      dayIndex,
      dayName: day.name,
      exercises,
    });
    localStorage.removeItem(draftKey(dayIndex));
    const next = (dayIndex + 1) % days.length;
    await setSetting('currentDay', next);
    toast(`Saved! Up next: Day ${next + 1} · ${days[next].name}`, 3000);
    clear(root);
    render(root);
  }
}

const toNum = (v) => {
  const s = String(v ?? '').trim();
  if (s === '') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Reference set for index i: same set number last time, else last time's final set. */
function refSet(ref, i) {
  if (!ref) return null;
  return ref.sets[i] || ref.sets[ref.sets.length - 1] || null;
}

function beats(weight, reps, ref) {
  if (!ref || reps == null) return false;
  if (weight > ref.weight) return true;
  return weight === ref.weight && reps > ref.reps;
}

function exerciseCard(ex, ref, unit, onChange) {
  const grid = h('div', { class: 'set-grid' });
  const lastLine = ref
    ? h('div', { class: 'last-line' }, `Last time (${fmtShort(ref.date)}): `, h('b', {}, ref.sets.map((s) => `${fmtNum(s.weight)}×${s.reps}`).join(', ')))
    : h('div', { class: 'last-line' }, 'No previous session');

  const card = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h3', {}, ex.name), h('span', { class: 'target' }, ex.target)),
    lastLine,
    grid,
    h('button', {
      class: 'btn sm block', style: 'margin-top:10px',
      onclick: () => { ex.sets.push({ weight: '', reps: '' }); onChange(); draw(); },
    }, icon('plus', 18), 'Add set'),
  );

  function draw() {
    clear(grid);
    grid.append(
      h('div', { class: 'hdr' }, 'Set'),
      h('div', { class: 'hdr' }, `Weight (${unit})`),
      h('div', { class: 'hdr' }, 'Reps'),
      h('div', {}),
    );
    ex.sets.forEach((set, i) => {
      const r = refSet(ref, i);
      const w = h('input', {
        type: 'text', inputmode: 'decimal', value: set.weight,
        placeholder: r ? fmtNum(r.weight) : '', 'aria-label': `Set ${i + 1} weight`,
      });
      const reps = h('input', {
        type: 'text', inputmode: 'numeric', value: set.reps,
        placeholder: r ? String(r.reps) : '', 'aria-label': `Set ${i + 1} reps`,
      });
      const update = () => {
        set.weight = w.value; set.reps = reps.value; onChange();
        const repsN = toNum(reps.value);
        const weightN = toNum(w.value) ?? r?.weight ?? 0;
        const beat = beats(weightN, repsN, r);
        w.classList.toggle('beat', beat);
        reps.classList.toggle('beat', beat);
      };
      w.addEventListener('input', update);
      reps.addEventListener('input', update);

      const remove = h('button', {
        class: 'btn icon ghost', 'aria-label': 'Remove set',
        onclick: () => { ex.sets.splice(i, 1); onChange(); draw(); },
      }, icon('x', 18));
      grid.append(h('div', { class: 'set-no' }, String(i + 1)), w, reps, remove);
      update();
    });
  }
  draw();
  return card;
}
