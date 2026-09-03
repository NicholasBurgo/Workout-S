// Minimal responsive SVG line chart. No dependencies.
// points: [{ label: 'Sep 1', value: 60 }, ...] in chronological order.
import { fmtNum } from './ui.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function niceStep(raw) {
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const base = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return base * mag;
}

export function lineChart(points, { unit = '', height = 190 } = {}) {
  const W = 360;
  const H = height;
  const pad = { top: 14, right: 16, bottom: 26, left: 40 };
  const root = svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img' });

  if (!points.length) return root;

  // Round the axis to "nice" tick steps (1, 2, 2.5, 5, 10 ...) so labels never repeat.
  const values = points.map((p) => p.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) { lo -= 2.5; hi += 2.5; }
  const step = niceStep((hi - lo) / 4);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;

  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - ((v - min) / (max - min)) * innerH;

  // Horizontal grid lines + y labels
  for (let v = min; v <= max + step / 1000; v += step) {
    const yy = y(v);
    root.appendChild(svg('line', { class: 'grid', x1: pad.left, x2: W - pad.right, y1: yy, y2: yy }));
    const label = svg('text', { class: 'label', x: pad.left - 6, y: yy + 4, 'text-anchor': 'end' });
    label.textContent = fmtNum(Number(v.toFixed(6)));
    root.appendChild(label);
  }

  // Area + line
  const coords = points.map((p, i) => [x(i), y(p.value)]);
  const path = coords.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  if (points.length > 1) {
    const base = pad.top + innerH;
    const area = `${path} L${coords[coords.length - 1][0].toFixed(1)},${base} L${coords[0][0].toFixed(1)},${base} Z`;
    root.appendChild(svg('path', { class: 'area', d: area }));
    root.appendChild(svg('path', { class: 'line', d: path }));
  }
  coords.forEach(([px, py], i) => {
    const dot = svg('circle', { class: 'dot', cx: px, cy: py, r: points.length > 30 ? 2.5 : 4 });
    const title = svg('title');
    title.textContent = `${points[i].label}: ${fmtNum(points[i].value)}${unit}`;
    dot.appendChild(title);
    root.appendChild(dot);
  });

  // X labels: first, middle, last
  const idxs = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  idxs.forEach((i) => {
    const anchor = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle';
    const t = svg('text', { class: 'label', x: x(i), y: H - 8, 'text-anchor': points.length === 1 ? 'middle' : anchor });
    t.textContent = points[i].label;
    root.appendChild(t);
  });

  return root;
}
