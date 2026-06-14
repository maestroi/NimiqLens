# NimLens frontend

Vue 3 + TypeScript + Vite + Tailwind CSS app for [NimLens](../README.md), a
Nimiq Pay Mini App that converts fiat prices to NIM, USDT, BTC, and ETH. Built
with `@nimiq/mini-app-sdk` for wallet access and Tesseract.js for on-device
price scanning.

See the [project README](../README.md) for an overview and
[`docs/dev-guide.md`](../docs/dev-guide.md) for full setup, LAN/phone testing,
and build instructions.

## Quick start

```bash
npm install
npm run dev
```

The dev server binds to `0.0.0.0:5173` and proxies `/api` to the backend on
`:8787` (see `vite.config.ts`), so it works from a phone on your LAN without
any extra config.

## Scripts

| Command          | Description                                    |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Start the Vite dev server.                      |
| `npm run build`   | Type-check (`vue-tsc -b`) and build to `dist/`. |
| `npm run preview` | Preview the production build locally.           |
| `npm run test`    | Run unit tests with Vitest.                     |

## Environment variables

Copy `../.env.example` to `.env` and adjust as needed:

- `VITE_API_BASE_URL` — base URL of the backend API. Leave empty for local dev
  (requests go through the Vite proxy); set to the deployed API URL (e.g.
  `https://api-nimiqlens.example.com`) for production builds.
- `VITE_TIP_ADDRESS` — NIM address used by the optional tip button on the
  About page.

## Project structure

```
src/
├── views/    Page-level components (Welcome, Converter, Rates, Scan, About)
├── stores/   Pinia stores (rates, scan, wallet)
├── lib/      Framework-agnostic helpers (API client, conversion math,
│             balance/affordability, OCR, price detection, Nimiq Pay bridge)
├── router/   Vue Router routes
└── assets/   Static assets
```

Each module under `lib/` and `stores/` has a matching `*.test.ts` file run via
Vitest.

## GitHub Pages build

The app can be built as a static site for GitHub Pages with a `/NimiqLens/`
base path:

```bash
GITHUB_PAGES=true npm run build
npm run preview -- --base /NimiqLens/
```

See the [project README](../README.md#github-pages-frontend-demo) for the
hosted demo and deployment workflow.
