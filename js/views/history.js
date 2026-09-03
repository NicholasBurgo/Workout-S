// Past workout sessions: tap to expand, delete.
import { db } from '../db.js';
import { h, clear, toast, confirm, setTitle, fmtDate, fmtNum } from '../ui.js';

export async function render(root) {
  setTitle('History');
  const sessions = await db.sessions.orderBy('time').reverse().toArray();

  if (!sessions.length) {
    root.append(h('div', { class: 'empty' }, 'No sessions yet. Log your first workout!'));
    return;
  }

  sessions.forEach((s) => root.append(sessionCard(s, root)));
}

function sessionCard(s, root) {
  const setCount = s.exercises.reduce((n, e) => n + e.sets.length, 0);
  const body = h('div', { class: 'session-body hidden' },
    h('table', {}, h('tbody', {},
      s.exercises.map((e) =>
        h('tr', {},
          h('td', {}, e.name),
          h('td', { class: 'sets' }, e.sets.map((x) => `${fmtNum(x.weight)}×${x.reps}`).join(', ')),
        )),
    )),
    h('button', { class: 'btn sm danger', style: 'margin-top:10px', onclick: async (ev) => {
      ev.stopPropagation();
      if (!confirm('Delete this session?')) return;
      await db.sessions.delete(s.id);
      toast('Session deleted');
      clear(root);
      render(root);
    } }, 'Delete session'),
  );

  const card = h('div', { class: 'card session', onclick: () => body.classList.toggle('hidden') },
    h('div', { class: 'row' },
      h('div', { class: 'grow' },
        h('div', { class: 'title' }, `${fmtDate(s.date)} · Day ${s.dayIndex + 1}`),
        h('div', { class: 'sub' }, `${s.dayName} · ${s.exercises.length} exercises · ${setCount} sets`),
      ),
      h('span', { class: 'muted' }, '▾'),
    ),
    body,
  );
  return card;
}
