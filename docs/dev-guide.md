# Developer Guide

## Prerequisites

- Go 1.24+
- Node.js 20+
- Docker & Docker Compose (optional, for the containerized backend)

## Running the backend

```bash
cd backend
cp ../.env.example .env   # then edit values as needed
go run .
```

The backend listens on `:8787` by default (`PORT`) and exposes:

- `GET /api/health`
- `GET /api/rates`
- `GET /api/balance/{address}`

Or via Docker Compose, from the repo root:

```bash
docker compose up --build
```

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server binds to `0.0.0.0:5173` (`server.host: true` in
`vite.config.ts`), so it's reachable from other devices on your network.

Copy `.env.example` to `frontend/.env`. For local dev you can leave
`VITE_API_BASE_URL` empty — the Vite dev server proxies `/api` to the backend on
`:8787`, including when you open the app from a phone via your LAN IP.

Set `VITE_API_BASE_URL` explicitly only for production builds where the API
lives on a different host.

## Testing on a phone via Nimiq Pay (LAN)

Nimiq Pay Mini Apps must be loaded over your local network, not `localhost`,
so a phone can reach your dev server.

1. Find your machine's LAN IP address (e.g. `192.168.1.42`).
2. Start the backend (`go run .` in `backend/` or `docker compose up`).
3. Start the frontend with `npm run dev` — note the **Network** URL Vite prints
   (e.g. `http://192.168.1.42:5173`). API calls go through the same origin; Vite
   proxies `/api` to the backend on your machine.
4. Set `ALLOWED_ORIGIN=http://192.168.1.42:5173` for the backend only if you
   changed it from the default `*` — otherwise skip this step.
5. On your phone, open Nimiq Pay and load the Network URL as a Mini App.
6. Confirm `init()` succeeds (`isInsideNimiqPay` becomes `true`) and tapping
   "Show wallet balance" triggers the native `listAccounts()` approval dialog.

Plain LAN HTTP is sufficient for most development, but mobile browsers and
WebViews only expose the camera API to secure contexts. To test camera scanning
on a physical phone, serve NimLens from an HTTPS URL with a certificate trusted
by the phone. An HTTP LAN URL such as `http://192.168.1.42:5173` cannot use
`getUserMedia`.

## Running tests

```bash
# Backend
cd backend && go test ./...

# Frontend
cd frontend && npm run test
```

## Building for production

```bash
cd frontend && npm run build   # outputs to frontend/dist
cd backend && go build ./...
```
