// Tiny DOM + formatting helpers shared by every view.

/**
 * h('div', { class: 'card', onclick: fn }, 'text', childNode, [more...])
 * Keys starting with "on" become event listeners. Boolean/value-ish keys are
 * set as properties so inputs behave; everything else is an attribute.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs || {})) {
    if (val == null || val === false) continue;
    if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'class') {
      el.className = val;
    } else if (['value', 'checked', 'disabled', 'selected'].includes(key)) {
      el[key] = val;
    } else {
      el.setAttribute(key, val === true ? '' : val);
    }
  }
  append(el, children);
  return el;
}

function append(parent, child) {
  if (child == null || child === false) return;
  if (Array.isArray(child)) {
    child.forEach((c) => append(parent, c));
  } else if (child instanceof Node) {
    parent.appendChild(child);
  } else {
    parent.appendChild(document.createTextNode(String(child)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function setTitle(text) {
  document.getElementById('page-title').textContent = text;
}

let toastTimer;
export function toast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function confirm(msg) {
  return window.confirm(msg);
}

/** Build a segmented control. onPick(key) is called when a segment is tapped. */
export function segments(items, activeKey, onPick) {
  return h('div', { class: 'segments' },
    items.map(([key, label]) =>
      h('button', { class: key === activeKey ? 'active' : '', onclick: () => onPick(key) }, label)
    )
  );
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
}

// ---------- numbers ----------

/** Parse an input's value to a finite number, or null when blank/invalid. */
export function numVal(input) {
  const s = String(input.value ?? '').trim();
  if (s === '') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function fmtNum(n, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '–';
  return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.0$/, '');
}

// ---------- dates (all local-time, keys are YYYY-MM-DD) ----------

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayKey = () => dateKey(new Date());

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function fmtDate(key, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  if (key === todayKey()) return 'Today';
  if (key === addDays(todayKey(), -1)) return 'Yesterday';
  return parseKey(key).toLocaleDateString(undefined, opts);
}

export function fmtShort(key) {
  return parseKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Monday of the week containing `key`. */
export function weekStart(key) {
  const d = parseKey(key);
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - offset);
  return dateKey(d);
}
