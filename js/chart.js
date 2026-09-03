// Minimal responsive SVG line chart. No dependencies.
// points: [{ label: 'Sep 1', value: 60 }, ...] in chronological order.
import { fmtNum } from './ui.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function lineChart(points, { unit = '', height = 190 } = {}) {
  const W = 360;
  const H = height;
  const pad = { top: 14, right: 16, bottom: 26, left: 40 };
  const root = svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img' });

  if (!points.length) return root;

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  min -= span * 0.1;
  max += span * 0.1;

  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - ((v - min) / (max - min)) * innerH;

  // Horizontal grid lines + y labels
  const ticks = 4;
  for (let t = 0; t <= ticks; t++) {
    const v = min + ((max - min) * t) / ticks;
    const yy = y(v);
    root.appendChild(svg('line', { class: 'grid', x1: pad.left, x2: W - pad.right, y1: yy, y2: yy }));
    const label = svg('text', { class: 'label', x: pad.left - 6, y: yy + 4, 'text-anchor': 'end' });
    label.textContent = fmtNum(v, 0);
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
