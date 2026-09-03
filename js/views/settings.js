// Targets, theme, units, backup/restore, danger zone.
import { getAllSettings, setSetting, exportAll, importAll, clearAll, resetProgram } from '../db.js';
import { h, toast, confirm, setTitle, numVal, applyTheme, todayKey } from '../ui.js';

export async function render(root) {
  setTitle('Settings');
  const s = await getAllSettings();

  const calIn = h('input', { type: 'text', inputmode: 'numeric', value: s.calorieTarget });
  const proIn = h('input', { type: 'text', inputmode: 'numeric', value: s.proteinTarget });
  const saveTargets = async () => {
    const c = numVal(calIn); const p = numVal(proIn);
    if (c == null || p == null) { toast('Enter both targets'); return; }
    await setSetting('calorieTarget', c);
    await setSetting('proteinTarget', p);
    toast('Targets saved');
  };

  root.append(
    h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); saveTargets(); } },
      h('span', { class: 'eyebrow' }, 'Daily targets'),
      h('div', { class: 'row' },
        h('label', { class: 'field', style: 'flex:1' }, h('span', {}, 'Calories (kcal)'), calIn),
        h('label', { class: 'field', style: 'flex:1' }, h('span', {}, 'Protein (g)'), proIn),
      ),
      h('button', { class: 'btn primary block', type: 'submit' }, 'Save targets'),
    ),

    h('div', { class: 'card' },
      h('span', { class: 'eyebrow' }, 'Appearance'),
      h('label', { class: 'field' }, h('span', {}, 'Theme'),
        h('select', { onchange: async (e) => { await setSetting('theme', e.target.value); applyTheme(e.target.value); } },
          [['system', 'Match system'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) =>
            h('option', { value: v, selected: s.theme === v }, l)))),
      h('label', { class: 'field' }, h('span', {}, 'Weight unit'),
        h('select', { onchange: async (e) => { await setSetting('weightUnit', e.target.value); toast('Unit updated (existing numbers are not converted)'); } },
          [['lb', 'Pounds (lb)'], ['kg', 'Kilograms (kg)']].map(([v, l]) =>
            h('option', { value: v, selected: s.weightUnit === v }, l)))),
    ),

    h('div', { class: 'card' },
      h('span', { class: 'eyebrow' }, 'Backup'),
      h('p', { class: 'muted small' }, 'All data stays on this device. Export a JSON file to back up or move to a new phone, then import it there.'),
      h('div', { class: 'row', style: 'margin-top:8px' },
        h('button', { class: 'btn', style: 'flex:1', onclick: doExport }, 'Export JSON'),
        h('button', { class: 'btn', style: 'flex:1', onclick: doImport }, 'Import JSON'),
      ),
    ),

    h('div', { class: 'card' },
      h('span', { class: 'eyebrow' }, 'Program'),
      h('div', { class: 'row' },
        h('a', { class: 'btn', style: 'flex:1', href: '#/program' }, 'Edit program'),
        h('button', { class: 'btn', style: 'flex:1', onclick: async () => {
          if (!confirm('Reset the program to the default Superman split? Logged sessions are kept.')) return;
          await resetProgram(); toast('Program reset');
        } }, 'Reset to default'),
      ),
    ),

    h('div', { class: 'card' },
      h('span', { class: 'eyebrow' }, 'Danger zone'),
      h('button', { class: 'btn danger block', onclick: async () => {
        if (!confirm('Delete ALL workouts, food logs, bodyweight and settings from this device? Export first if you want a backup.')) return;
        if (!confirm('Really delete everything? This cannot be undone.')) return;
        await clearAll();
        location.reload();
      } }, 'Delete all data'),
    ),

    h('p', { class: 'footnote' }, 'Superman Log. Offline, no accounts, no tracking.'),
  );
}

async function doExport() {
  const data = await exportAll();
  const json = JSON.stringify(data, null, 2);
  const filename = `superman-log-${todayKey()}.json`;
  const file = new File([json], filename, { type: 'application/json' });

  // On iOS (especially installed PWAs) the share sheet is the reliable way to save a file.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Superman Log backup' });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user cancelled
    }
  }
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Backup downloaded');
}

function doImport() {
  const input = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const counts = `${(data.sessions || []).length} workouts, ${(data.foodEntries || []).length} food entries, ${(data.bodyweight || []).length} bodyweight entries`;
      if (!confirm(`Replace everything on this device with this backup?\n(${counts})`)) return;
      await importAll(data);
      toast('Backup imported');
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      input.remove();
    }
  });
  document.body.append(input);
  input.click();
}
