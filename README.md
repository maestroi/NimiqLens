# NimLens

NimLens is a mobile-first [Nimiq Pay](https://nimiq.com/pay) Mini App that
turns any fiat price into its equivalent in NIM, USDT, BTC, and ETH. Enter a
price — or scan one with your camera — pick a currency (EUR, USD, GBP, CHF),
and see what it's worth in crypto.

NimLens is open source (MIT), does not custody funds, does not handle seed
phrases. Wallet account access and camera access are only requested on explicit
user action.

## Features

- **Convert** any fiat price to NIM, USDT, BTC, and ETH in real time.
- **Scan** a price tag, receipt, or menu — on-device OCR (no uploads) detects
  the price for you, with a confirm/edit step before conversion.
- **Connect your Nimiq Pay wallet** to see your NIM balance and whether it
  covers the price.
- **Rates** screen with the current exchange rates, source, and staleness
  indicator.
- Optional one-tap **tip** to support development.

## Architecture

```
NimLens/
├── frontend/   Vue 3 + TypeScript + Vite + Tailwind CSS, @nimiq/mini-app-sdk
├── backend/    Go REST API — rate fetching/caching, NIM balance proxy
├── docs/       privacy policy, submission description, developer guide
├── docker-compose.yml
└── .env.example
```

The frontend never calls third-party rate APIs directly — all rate data is
normalized and cached by the Go backend. Wallet operations go directly through
Nimiq Pay's injected provider, per the Mini Apps rules.

## Getting started

See [`docs/dev-guide.md`](docs/dev-guide.md) for local setup, running tests,
and testing on a phone inside Nimiq Pay over your LAN.

Quick start with Docker Compose:

```bash
docker compose up --build
```

Then, in a separate terminal:

```bash
cd frontend && npm install && npm run dev
```

## Privacy

See [`docs/privacy.md`](docs/privacy.md) — camera frames are processed
entirely on-device and are never uploaded or stored; wallet account access is
only requested when you ask to show your balance and requires approval in Nimiq Pay.

## Credits

- Exchange rates: [CoinGecko](https://www.coingecko.com)
- On-device OCR: [Tesseract.js](https://tesseract.projectnaptha.com)
- Wallet integration: [@nimiq/mini-app-sdk](https://nimiq.dev)

## License

[MIT](LICENSE)

## Self-hosting (Docker)

Every push to `main` builds and pushes container images to GHCR via
[`.github/workflows/docker-build.yml`](.github/workflows/docker-build.yml):

- `ghcr.io/maestroi/nimlens-backend:latest`
- `ghcr.io/maestroi/nimlens-frontend:latest`

The frontend image bakes in `VITE_API_BASE_URL` at build time (set as the
`VITE_API_BASE_URL` repo variable), so it can point at a separate API
subdomain — see [`docker-compose.homelab.yml.example`](docker-compose.homelab.yml.example)
for a two-subdomain Traefik setup (`nimiqlens.<domain>` /
`api-nimiqlens.<domain>`). Copy it to `docker-compose.homelab.yml` (gitignored)
and fill in your domains:

```bash
cp docker-compose.homelab.yml.example docker-compose.homelab.yml
# edit domains, then:
docker compose -f docker-compose.homelab.yml up -d
```

## GitHub Pages (frontend demo)

The frontend is published automatically on every push to `main` (when `frontend/` changes).

**Live site:** https://maestroi.github.io/NimiqLens/

### One-time GitHub setup

1. Open **Settings → Pages** on the GitHub repo.
2. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).
3. Push to `main` or run the **Deploy frontend to GitHub Pages** workflow manually.

### Backend API on Pages (optional)

Rates and browser-only balance fallback need a hosted backend URL at build time. In the repo, go to
**Settings → Secrets and variables → Actions → Variables** and set:

- `VITE_API_BASE_URL` — e.g. `https://your-backend.example.com`
- `VITE_TIP_ADDRESS` — your NIM tip address (optional)

Wallet features inside **Nimiq Pay** still use the injected provider and do not depend on this URL for balance.

### Local GitHub Pages preview

```bash
cd frontend
GITHUB_PAGES=true npm run build
npm run preview -- --base /NimiqLens/
```
