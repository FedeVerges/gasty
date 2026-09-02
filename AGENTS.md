# Repository Guidelines

## Project structure

Gasty is a mobile-first expense-tracking PWA for Argentina. The React application lives in `src/`:

- `components/` groups UI by feature, such as `add/`, `dashboard/`, and `transactions/`. Reusable primitives belong in `components/ui/`.
- `hooks/` contains data and browser-behavior hooks. `context/` contains shared UI state.
- `lib/` holds domain and persistence code: Dexie access, parsing, recurring transactions, CSV, and formatting.
- `types/index.ts` is the shared type entry point. Keep cross-feature types there.
- Unit and integration tests are in `tests/`; browser scenarios are in `e2e/` with fixtures under `e2e/fixtures/`.
- Product and architecture notes live in `docs/`. Static PWA assets live in `public/`.

Do not introduce catch-all folders such as `src/utils/`, `src/store/`, `src/router/`, or `src/pages/`.

## Build, test, and development

Run commands from the repository root:

```bash
npm run dev          # Start Vite's development server
npm run build        # Type-check and create dist/
npm run lint         # Run ESLint on the project
npm test             # Run Vitest once
npm run test:watch   # Keep Vitest running while editing
npm run test:e2e     # Run Playwright browser tests
```

Run `npm run lint` and `npm test` for non-trivial changes. Run `npm run test:e2e` when changing user flows, layouts, imports, or persistence.

## Code style and naming

Use two-space indentation, single quotes, and no semicolons. ESLint is the source of truth; there is no separate formatter. Use `PascalCase.tsx` for components, `useCamelCase.ts` for hooks, and lowercase feature names for folders. Keep UI strings in Spanish for the `es-AR` product.

Use Tailwind v4 tokens defined in `src/index.css`; do not add hardcoded hex colors. Include a `[data-theme="dark"]` counterpart for each new theme color. Persist user data with Dexie and IndexedDB, never `localStorage`. Store `Transaction.date` in local `YYYY-MM-DD` form with `toLocalISO`, not `toISOString()`.

## Testing guidelines

Name unit tests `*.test.ts` and E2E tests `*.spec.ts`. Describe observable behavior, for example `it('parsea gasto con miles', ...)`. Use `fake-indexeddb/auto` for Dexie tests, reset the database between cases, and cover parser, CSV, and recurring edge cases when those rules change. No coverage threshold is configured.

## Commits and pull requests

Recent history uses concise conventional prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, and `config`. Write imperative subjects, for example `fix: preserve local dates in CSV import`.

Pull requests should explain the user-visible change, link the relevant issue when one exists, list validation commands, and include screenshots for UI changes. Keep unrelated cleanup out of the same PR.
