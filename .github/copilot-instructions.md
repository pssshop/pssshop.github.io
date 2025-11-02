# Copilot Instructions for pssshop

Purpose: concise, actionable guidance so an AI coding assistant can be immediately productive with this React + Vite static site.

Keep this short — open the referenced files when in doubt.

- Project overview
  - Tech: React (JSX) + Vite; CSS in `src/style.css`. App is a static SPA built into `docs/` for GitHub Pages.
  - Entry: `src/main.jsx` → `src/App.jsx` (main UI + logic). Data files live under `docs/` in dev.

- Key files
  - `src/App.jsx` — main UI, search/sort, theme toggle, admin mode, export (`downloadPricesJson`). First place to edit UI behavior.
  - `src/style.css` — central stylesheet; prefer classes here over inline styles.
  - `docs/inventory.json`, `docs/prices.json` — runtime data. `prices.json` may be numeric or objects `{ price, lastUpdate }`.
  - `scripts/clean-docs.js` — cleans `docs/` before builds (preserves a few files).
  - `vite.config.js` — build output set to `docs/` for GitHub Pages.
  - `.husky/pre-commit` — runs `npm run build` and stages `docs/` before commit.

- How it works (big picture)
  - The SPA fetches `inventory.json` and `prices.json` at runtime and renders a searchable table.
  - Admin mode (F1) enables inline price edits; Export builds `prices.json` as `{ id: { price, lastUpdate } }`, pruning stale entries (>7 days).
  - Price precedence: admin edit → `prices.json` → inventory `item_price`.

- Developer workflows
  - Install / dev:
    - npm install
    - npm run dev (Vite dev server)
    - npm run build (produces `docs/`)
  - Pre-commit: Husky runs `npm run build` and stages `docs/`. Run build locally before committing UI changes.

- Patterns & gotchas
  - Expect `inventory` shape: `{ generated, item_count, items: [...] }` — use `inventory?.items || []`.
  - `prices.json` supports both numeric and object forms. Exports use object form; update parsing and export code together.
  - `adminPriceEdits` stores strings to preserve user input; convert to Number only on export.
  - Rows are intentionally not tabbable — Tab should focus inline inputs. Keep this behavior.

- Integration points
  - Data loaded via `fetch()` in `src/App.jsx` (DEV uses `./docs/*`, PROD uses root).
  - Export uses `downloadPricesJson(items)` to merge existing `prices`, admin edits, and inventory prices, then triggers a browser download.

- Small concrete examples
  - Add admin control: edit `src/App.jsx` inside the `adminView && ...` block and use `handlePriceEdit(id, value)`.
  - Change pruning: update `sevenDays` in `downloadPricesJson`.
  - To add `firstSeen`, set `firstSeen: existing?.firstSeen || nowStr` when writing new entries in `downloadPricesJson`.

- Build / sanity checks
  - No unit tests. Quick validation: run `npm run build` and verify it completes without errors.

- Where to look first when things break
  - `src/App.jsx` — largest, most-changing file for UI logic.
  - If data fails to load, check fetch paths and `import.meta.env.DEV` logic.

---

Assistant reply style (project preference):

- Default replies: short (3–5 bullet points).
- Provide full/detailed responses only when explicitly requested (say "full" or "expand").
- Keep edits, file lists, and commands concise unless the developer asks for more.
- Important: do NOT attempt to execute or run project code, tests, or shell commands in the workspace. Only suggest commands, edits, or steps to run; never run them yourself or install packages.

Add this note so future AI contributors follow the repository owner's communication preference.


