// Entry point: hash router, theme, service worker registration.
import { getSetting } from './db.js';
import { clear, applyTheme } from './ui.js';
import * as workout from './views/workout.js';
import * as programEditor from './views/program-editor.js';
import * as history from './views/history.js';
import * as food from './views/food.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';

const routes = {
  workout: { view: workout, tab: 'workout' },
  program: { view: programEditor, tab: 'workout' },
  food: { view: food, tab: 'food' },
  history: { view: history, tab: 'history' },
  progress: { view: progress, tab: 'progress' },
  settings: { view: settings, tab: 'settings' },
};

async function route() {
  const name = (location.hash || '#/workout').slice(2).split('/')[0];
  const r = routes[name] || routes.workout;
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === r.tab));
  const root = document.getElementById('view');
  clear(root);
  window.scrollTo(0, 0);
  try {
    await r.view.render(root);
  } catch (err) {
    console.error(err);
    root.textContent = `Something went wrong: ${err.message}`;
  }
}

async function init() {
  applyTheme(await getSetting('theme'));
  window.addEventListener('hashchange', route);
  await route();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW registration failed', err));
  }
}

init();
