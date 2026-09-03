// Inline stroke icons (24x24 grid). icon('name') returns an <svg> element.
const PATHS = {
  dumbbell: 'M6 5v14M18 5v14M3 8v8M21 8v8M6 12h12',
  food: 'M4 3v7a3 3 0 0 0 6 0V3M7 3v18M18 3c-2 1-4 4-4 8a2 2 0 0 0 2 2h2v8M18 3v18',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14M5 12l7 7 7-7',
  check: 'M5 13l4 4L19 7',
};

const NS = 'http://www.w3.org/2000/svg';

export function icon(name, size = 22) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ic');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', PATHS[name] || '');
  svg.appendChild(path);
  return svg;
}
