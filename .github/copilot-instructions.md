# Copilot Instructions for pssshop

## Project Overview
- **Purpose:** PSSShop is a React + Vite webapp for browsing/searching a personal Pixel Starships inventory, with prices and market research data.
- **Major Components:**
  - `src/App.jsx`: Main UI logic, including search, sorting, theme toggle, and admin view.
  - `docs/`: Static assets and build output. Includes `inventory.json` and `prices.json` for item data and pricing.
  - `scripts/clean-docs.js`: Cleans the build output directory before each build, preserving only essential files.
  - `.husky/pre-commit`: Git hook to auto-build and stage `docs/` before commit.
  - `vite.config.js`: Vite config, outputs build to `docs/` for GitHub Pages hosting.
  - `src/style.css`: Main CSS styles. Any additional styles should be added here when possible instead of inline styles.

## Developer Workflows
- **Build:**
  - Run `npm run build` (runs `scripts/clean-docs.js` then Vite build; output is in `docs/`).
  - For local dev: `npm run dev` (Vite dev server).
- **Pre-commit Automation:**
  - Commits via terminal will auto-build and stage `docs/` via Husky pre-commit hook.
  - VS Code GUI commits do not run hooks unless Husky is installed and configured.
- **Deploy:**
  - Push to `main` branch; GitHub Pages serves from `docs/`.

## Project-Specific Patterns & Conventions
- **Theme Toggle:** Floating icon in top right, toggles between light/dark/auto modes.
- **Data Loading:**
  - Loads `inventory.json` and `prices.json` from `docs/` (dev) or root (prod).
  - All item data and prices are client-side, no backend.
- **Build Output:**
  - Only essential files (`favicon.png`, `inventory.json`, `prices.json`) are preserved in `docs/` between builds.
- **Custom Sorting:**
  - Price and bonus columns have custom sort logic in `App.jsx`.
- **Search Highlighting:**
  - Search terms are highlighted in results using a regex split in `App.jsx`.

## Integration Points
- **React + Vite:** Main stack; Vite config outputs to `docs/` for static hosting.
- **Husky:** Used for pre-commit build automation.
- **GitHub Pages:** Serves the site from the `docs/` directory.

## Examples
- To add a new item, update `docs/inventory.json` and `docs/prices.json`.
- To change build output, edit `vite.config.js` and/or `scripts/clean-docs.js`.
- To extend admin features, modify logic in `src/App.jsx` (see adminView state and icon).

