# Superman Log

A mobile-first, fully offline PWA for tracking workouts, calories and protein.
No backend, no accounts, no analytics. Everything is stored on your device in
IndexedDB (via [Dexie](https://dexie.org/)).

Comes preloaded with the RP Strength "Superman" 5-day split.

## Features

- **Workout log** – logs sets per exercise, shows last session's weight/reps as
  placeholders, highlights green when you beat them, add-set button per
  exercise, auto-advances to the next day after saving.
- **Editable program** – rename days, change sets/rep targets, add, reorder,
  swap or remove exercises. Reset to the default split any time.
- **History** – all past sessions, tap to expand, delete.
- **Progress** – per-exercise chart of best set weight over time, plus a
  bodyweight log with a trend chart.
- **Food** – daily calorie and protein targets with progress bars, quick add,
  one-tap recent foods, a saved-food library, day-by-day history and weekly
  summaries (avg calories, avg protein, days hitting protein target).
- **Backup** – export everything as JSON and import it on another phone.
- Dark mode, numeric keyboards, big thumb-friendly inputs, installable to
  the home screen, works with no signal.

## Project layout

```
index.html          app shell
manifest.json       PWA manifest
sw.js               service worker (offline cache; bump CACHE_VERSION on release)
css/style.css       all styling, light + dark themes
js/app.js           hash router + service worker registration
js/db.js            Dexie schema, settings, export/import
js/program.js       default Superman split
js/ui.js            tiny DOM helper, toast, date utils
js/chart.js         dependency-free SVG line chart
js/views/*.js       one module per screen
vendor/dexie.min.js Dexie (vendored so it works offline)
icons/              app icons (regenerate with tools/make-icons.py)
```

Plain HTML/JS/CSS with ES modules. There is no build step.

## Running locally

ES modules and service workers need to be served over HTTP (not opened as a
`file://`). Any static server works. From the repo folder:

```sh
# Python
python3 -m http.server 8080

# or Node
npx serve .
```

Then open <http://localhost:8080>.

To test on your phone over your home Wi-Fi, find your computer's LAN IP
(e.g. `192.168.1.20`) and open `http://192.168.1.20:8080` on the phone.
Note that "Add to Home Screen" / service workers require a **secure
context**: `localhost` counts, but a plain `http://192.168.x.x` address does
not, so install from a hosted HTTPS URL (below) for the full offline
experience. Everything else works fine over LAN for trying it out.

## Hosting on GitHub Pages (recommended)

1. Push this repo to GitHub.
2. In the repo go to **Settings → Pages**.
3. Under **Build and deployment**, set *Source* to **Deploy from a branch**,
   pick your branch (e.g. `main`) and the **/ (root)** folder, then Save.
4. After a minute the site is live at
   `https://<your-username>.github.io/<repo-name>/`.

All paths in the app are relative, so it works from a sub-path like
`/Workout-S/` without any configuration.

Whenever you change the app, bump `CACHE_VERSION` in `sw.js` so installed
phones pick up the new files on their next launch.

## Installing on your phone

### iPhone / iPad (Safari)

1. Open the hosted URL in **Safari** (other browsers on iOS can't install PWAs).
2. Tap the **Share** button (the square with an arrow).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Launch it from the home screen. It opens full-screen and works offline.

Tips for iOS:

- Use the **Export JSON** button in Settings regularly. It opens the share
  sheet so you can save to Files, AirDrop, or send it to yourself.
- iOS can clear website storage for sites you haven't opened in a while, but
  it does *not* do this for apps installed to the home screen. Install it and
  you're safe.

### Android (Chrome)

1. Open the hosted URL in **Chrome**.
2. Either tap the **Install** banner / prompt, or open the **⋮** menu and tap
   **Install app** (older versions: **Add to Home screen**).
3. Launch it from the home screen or app drawer.

Samsung Internet, Edge and Firefox on Android also support installing from
their menus.

## Moving to a new phone

1. Old phone: **Settings → Export JSON**, save or share the file.
2. New phone: install the app, then **Settings → Import JSON** and pick the
   file. This replaces everything on the new device with the backup.

## Data model (for the curious)

| Table         | Contents                                              |
| ------------- | ----------------------------------------------------- |
| `settings`    | targets, theme, weight unit, current day of the split |
| `program`     | the editable day/exercise list                        |
| `sessions`    | logged workouts: date, day, exercises, sets           |
| `foodEntries` | one row per logged food on a given day                |
| `foods`       | food library used for the one-tap buttons             |
| `bodyweight`  | one weight per date                                   |

Unsaved workout entries are kept in `localStorage` so a page refresh mid-set
doesn't lose them.

## Regenerating icons

```sh
python3 tools/make-icons.py
```

Needs only the Python standard library.

## License

MIT. Dexie is MIT licensed (see `vendor/DEXIE-LICENSE`).
