// All persistent data lives in IndexedDB via Dexie (loaded globally from vendor/).
import { DEFAULT_PROGRAM } from './program.js';

export const db = new Dexie('superman-log');

db.version(1).stores({
  settings: 'key',                 // { key, value }
  program: 'id',                   // { id: 1, days: [...] }
  sessions: '++id, date, time',    // workout sessions
  foodEntries: '++id, date',       // { id, date, name, calories, protein, time }
  foods: '++id, &key, lastUsed',   // food library: { id, key, name, calories, protein, lastUsed, useCount }
  bodyweight: 'date',              // { date, weight }
});

export const DEFAULT_SETTINGS = {
  calorieTarget: 2500,
  proteinTarget: 180,
  currentDay: 0,
  theme: 'system',
  weightUnit: 'lb',
};

export async function getSetting(key) {
  const row = await db.settings.get(key);
  return row ? row.value : DEFAULT_SETTINGS[key];
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

export async function getAllSettings() {
  const rows = await db.settings.toArray();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/** Returns the program's day list, seeding the default split on first run. */
export async function getProgram() {
  let doc = await db.program.get(1);
  if (!doc) {
    doc = { id: 1, days: structuredClone(DEFAULT_PROGRAM) };
    await db.program.put(doc);
  }
  return doc.days;
}

export async function saveProgram(days) {
  await db.program.put({ id: 1, days });
}

export async function resetProgram() {
  await saveProgram(structuredClone(DEFAULT_PROGRAM));
}

/** Snapshot everything for JSON export. */
export async function exportAll() {
  const [settings, program, sessions, foodEntries, foods, bodyweight] = await Promise.all([
    db.settings.toArray(),
    db.program.toArray(),
    db.sessions.toArray(),
    db.foodEntries.toArray(),
    db.foods.toArray(),
    db.bodyweight.toArray(),
  ]);
  return {
    app: 'superman-log',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings, program, sessions, foodEntries, foods, bodyweight,
  };
}

/** Replace everything with the contents of an export file. */
export async function importAll(data) {
  if (!data || data.app !== 'superman-log') {
    throw new Error('Not a Superman Log backup file.');
  }
  const tables = [db.settings, db.program, db.sessions, db.foodEntries, db.foods, db.bodyweight];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
    await db.settings.bulkAdd(data.settings || []);
    await db.program.bulkAdd(data.program || []);
    await db.sessions.bulkAdd(data.sessions || []);
    await db.foodEntries.bulkAdd(data.foodEntries || []);
    await db.foods.bulkAdd(data.foods || []);
    await db.bodyweight.bulkAdd(data.bodyweight || []);
  });
}

export async function clearAll() {
  await db.delete();
  localStorage.clear();
}
