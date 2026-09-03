// Edit the split: day names, exercises, set counts and rep targets.
import { getProgram, saveProgram, resetProgram } from '../db.js';
import { h, clear, toast, confirm, setTitle } from '../ui.js';

export async function render(root) {
  setTitle('Edit program');
  const days = structuredClone(await getProgram());

  const list = h('div');
  root.append(
    h('p', { class: 'muted' }, 'Rename anything, change sets or rep targets, reorder, or swap exercises. Changes apply after you tap Save.'),
    list,
    h('button', { class: 'btn sm block', style: 'margin-bottom:12px', onclick: () => { days.push({ name: 'New day', exercises: [] }); draw(); } }, '+ Add day'),
    h('button', { class: 'btn primary block', onclick: save }, 'Save program'),
    h('div', { class: 'row', style: 'margin-top:12px; justify-content:space-between' },
      h('a', { class: 'btn ghost', href: '#/workout' }, 'Cancel'),
      h('button', { class: 'btn ghost danger', onclick: reset }, 'Reset to Superman split'),
    ),
  );

  function draw() {
    clear(list);
    days.forEach((day, di) => list.append(dayCard(day, di)));
  }

  function dayCard(day, di) {
    const exList = h('div');
    const card = h('div', { class: 'card' },
      h('div', { class: 'row', style: 'margin-bottom:8px' },
        h('strong', { style: 'white-space:nowrap' }, `Day ${di + 1}`),
        h('input', { type: 'text', value: day.name, placeholder: 'Day name', oninput: (e) => { day.name = e.target.value; } }),
        h('button', { class: 'btn icon ghost danger', 'aria-label': 'Delete day', onclick: () => {
          if (confirm(`Delete Day ${di + 1} (${day.name})?`)) { days.splice(di, 1); draw(); }
        } }, '🗑'),
      ),
      exList,
      h('button', { class: 'btn sm block', onclick: () => { day.exercises.push({ name: '', sets: 2, reps: '10-15' }); drawEx(); } }, '+ Add exercise'),
    );

    function drawEx() {
      clear(exList);
      day.exercises.forEach((ex, ei) => {
        const move = (dir) => {
          const j = ei + dir;
          if (j < 0 || j >= day.exercises.length) return;
          [day.exercises[ei], day.exercises[j]] = [day.exercises[j], day.exercises[ei]];
          drawEx();
        };
        exList.append(
          h('div', { class: 'ex-row' },
            h('div', { class: 'row' },
              h('input', { type: 'text', value: ex.name, placeholder: 'Exercise name', oninput: (e) => { ex.name = e.target.value; } }),
              h('button', { class: 'btn icon ghost', 'aria-label': 'Move up', onclick: () => move(-1) }, '↑'),
              h('button', { class: 'btn icon ghost', 'aria-label': 'Move down', onclick: () => move(1) }, '↓'),
              h('button', { class: 'btn icon ghost danger', 'aria-label': 'Remove exercise', onclick: () => { day.exercises.splice(ei, 1); drawEx(); } }, '×'),
            ),
            h('div', { class: 'grid' },
              h('label', { class: 'field' }, h('span', {}, 'Sets'),
                h('input', { type: 'text', inputmode: 'numeric', value: ex.sets, oninput: (e) => { ex.sets = Math.max(1, parseInt(e.target.value, 10) || 1); } })),
              h('label', { class: 'field' }, h('span', {}, 'Reps (e.g. 10-15, AMRAP)'),
                h('input', { type: 'text', value: ex.reps, oninput: (e) => { ex.reps = e.target.value; } })),
            ),
          ),
        );
      });
    }
    drawEx();
    return card;
  }

  async function save() {
    const cleaned = days.map((d) => ({
      name: d.name.trim() || 'Untitled day',
      exercises: d.exercises
        .filter((e) => e.name.trim())
        .map((e) => ({ name: e.name.trim(), sets: Math.max(1, Number(e.sets) || 1), reps: String(e.reps).trim() || '10-15' })),
    }));
    await saveProgram(cleaned);
    toast('Program saved');
    location.hash = '#/workout';
  }

  async function reset() {
    if (!confirm('Replace your program with the default Superman split? Your logged sessions are kept.')) return;
    await resetProgram();
    toast('Program reset');
    location.hash = '#/workout';
  }

  draw();
}
