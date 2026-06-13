# NimLens Phase 4 — Tip Button, Docs & Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the optional NIM tip/support button to the About screen, and round out the repository's open-source compliance: `LICENSE` (MIT), `docs/privacy.md`, `docs/submission.md`, `docs/dev-guide.md`, and a root `README.md`.

**Architecture:** The tip button is a small addition to `walletStore` (a `sendTip()` action calling `sendBasicTransactionWithData`) and `AboutView.vue`, gated on `isInsideNimiqPay && address` exactly like the rest of the wallet UI. The remaining work is documentation: four new Markdown files plus `LICENSE`, all at the repo root or under `docs/`, with no code dependencies. `.env.example` already contains the real `VITE_TIP_ADDRESS` (confirmed correct, no change needed).

**Tech Stack:** Vue 3 + TypeScript (continuing prior phases), Pinia, `@nimiq/mini-app-sdk`'s `sendBasicTransactionWithData`, Vitest + `@vue/test-utils`.

---

## File Structure

```
NimLens/
├── LICENSE                     (new)
├── README.md                   (new)
├── docs/
│   ├── privacy.md              (new)
│   ├── submission.md           (new)
│   └── dev-guide.md            (new)
└── frontend/src/
    ├── vite-env.d.ts            (modified: add VITE_TIP_ADDRESS)
    ├── stores/
    │   ├── wallet.ts            (modified: add TIP_AMOUNT_LUNA, sendTip())
    │   └── wallet.test.ts       (modified: add sendTip tests)
    └── views/
        ├── AboutView.vue        (modified: add tip button)
        └── AboutView.test.ts    (new)
```

---

### Task 1: Tip button on the About screen

**Files:**
- Modify: `frontend/src/vite-env.d.ts`
- Modify: `frontend/src/stores/wallet.ts`
- Modify: `frontend/src/stores/wallet.test.ts`
- Modify: `frontend/src/views/AboutView.vue`
- Create: `frontend/src/views/AboutView.test.ts`

- [ ] **Step 1: Add `VITE_TIP_ADDRESS` to the env type**

In `frontend/src/vite-env.d.ts`, update `ImportMetaEnv`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_TIP_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 2: Write the failing tests for `sendTip`**

In `frontend/src/stores/wallet.test.ts`, add these two tests at the end of the `describe('useWalletStore', ...)` block (after the existing `'records balanceError...'` test):

```ts
  it('sends a tip transaction and records the tx hash', async () => {
    const sendBasicTransactionWithData = vi.fn().mockResolvedValue('tx-hash-123')
    vi.spyOn(nimiq, 'initNimiq').mockResolvedValue({
      listAccounts: vi.fn().mockResolvedValue([ADDRESS]),
      sendBasicTransactionWithData,
    } as any)
    vi.spyOn(api, 'fetchBalance').mockResolvedValue({ address: ADDRESS, balance_nim: 123.45 })

    const store = useWalletStore()
    await store.init()
    await store.connect()
    await store.sendTip()

    expect(sendBasicTransactionWithData).toHaveBeenCalledWith({
      recipient: import.meta.env.VITE_TIP_ADDRESS,
      value: TIP_AMOUNT_LUNA,
      data: 'NimLens tip',
    })
    expect(store.tipTxHash).toBe('tx-hash-123')
    expect(store.tipError).toBeNull()
  })

  it('records tipError when the tip transaction fails', async () => {
    const sendBasicTransactionWithData = vi.fn().mockRejectedValue(new Error('User rejected'))
    vi.spyOn(nimiq, 'initNimiq').mockResolvedValue({
      listAccounts: vi.fn().mockResolvedValue([ADDRESS]),
      sendBasicTransactionWithData,
    } as any)
    vi.spyOn(api, 'fetchBalance').mockResolvedValue({ address: ADDRESS, balance_nim: 123.45 })

    const store = useWalletStore()
    await store.init()
    await store.connect()
    await store.sendTip()

    expect(store.tipTxHash).toBeNull()
    expect(store.tipError).toBe('User rejected')
  })
```

Also update the import at the top of the file to bring in `TIP_AMOUNT_LUNA`:

```ts
import { useWalletStore, TIP_AMOUNT_LUNA } from './wallet'
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
cd /home/maestro/Documents/projects/NimiqLens/frontend && npm run test
```
Expected: FAIL — `TIP_AMOUNT_LUNA` is not exported / `store.sendTip is not a function`

- [ ] **Step 4: Add `TIP_AMOUNT_LUNA` and `sendTip` to the wallet store**

In `frontend/src/stores/wallet.ts`, add the exported constant above `defineStore`, and extend `state` and `actions`:

```ts
import { defineStore } from 'pinia'
import { initNimiq, type NimiqProvider } from '../lib/nimiq'
import { fetchBalance } from '../lib/api'
import { shortenAddress } from '../lib/address'

/** 5 NIM, in Luna (1 NIM = 100,000 Luna). */
export const TIP_AMOUNT_LUNA = 500_000

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    provider: null as NimiqProvider | null,
    isInsideNimiqPay: false,
    initialized: false,
    address: null as string | null,
    balanceNim: null as number | null,
    balanceError: null as string | null,
    tipTxHash: null as string | null,
    tipError: null as string | null,
  }),
  getters: {
    shortAddress: (state): string | null => (state.address ? shortenAddress(state.address) : null),
  },
  actions: {
    async init() {
      this.provider = await initNimiq()
      this.isInsideNimiqPay = this.provider !== null
      this.initialized = true
    },
    async connect() {
      if (!this.provider) return
      const accounts = await this.provider.listAccounts()
      this.address = Array.isArray(accounts) ? (accounts[0] ?? null) : null
      if (this.address) await this.loadBalance()
    },
    async loadBalance() {
      if (!this.address) return
      this.balanceError = null
      try {
        const resp = await fetchBalance(this.address)
        this.balanceNim = resp.balance_nim
      } catch (e) {
        this.balanceError = e instanceof Error ? e.message : String(e)
        this.balanceNim = null
      }
    },
    async sendTip() {
      if (!this.provider || !this.address) return
      this.tipError = null
      this.tipTxHash = null
      try {
        this.tipTxHash = await this.provider.sendBasicTransactionWithData({
          recipient: import.meta.env.VITE_TIP_ADDRESS,
          value: TIP_AMOUNT_LUNA,
          data: 'NimLens tip',
        })
      } catch (e) {
        this.tipError = e instanceof Error ? e.message : String(e)
      }
    },
  },
})
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd /home/maestro/Documents/projects/NimiqLens/frontend && npm run test
```
Expected: PASS

- [ ] **Step 6: Write the failing AboutView tests**

Create `frontend/src/views/AboutView.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AboutView from './AboutView.vue'
import { useWalletStore } from '../stores/wallet'

const ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('AboutView', () => {
  it('hides the tip button when not connected to Nimiq Pay', () => {
    const wrapper = mount(AboutView)
    expect(wrapper.text()).not.toContain('Tip')
  })

  it('shows the tip button once a wallet is connected', () => {
    const walletStore = useWalletStore()
    walletStore.$patch({ isInsideNimiqPay: true, address: ADDRESS })

    const wrapper = mount(AboutView)
    expect(wrapper.text()).toContain('Tip')
  })

  it('sends a tip when the button is pressed', async () => {
    const walletStore = useWalletStore()
    walletStore.$patch({ isInsideNimiqPay: true, address: ADDRESS })
    walletStore.sendTip = vi.fn()

    const wrapper = mount(AboutView)
    await wrapper.find('button').trigger('click')

    expect(walletStore.sendTip).toHaveBeenCalled()
  })
})
```

- [ ] **Step 7: Run the tests to verify they fail**

```bash
cd /home/maestro/Documents/projects/NimiqLens/frontend && npm run test
```
Expected: FAIL — `Failed to resolve import "./AboutView.vue"` has no button / text "Tip" not found

- [ ] **Step 8: Add the tip button to AboutView**

Replace the entire contents of `frontend/src/views/AboutView.vue`:

```vue
<script setup lang="ts">
import { useWalletStore } from '../stores/wallet'

const walletStore = useWalletStore()
</script>

<template>
  <div class="min-h-screen p-4 pb-24 flex flex-col gap-4">
    <h1 class="text-2xl font-bold">About NimLens</h1>
    <p class="text-slate-300">
      NimLens converts real-world fiat prices into NIM, USDT, BTC, and ETH so you can quickly
      see what something is worth in crypto.
    </p>

    <h2 class="text-lg font-semibold">Nimiq Pay integration</h2>
    <p class="text-slate-300">
      NimLens connects to your Nimiq Pay wallet only when you tap "Connect Wallet". It reads
      your address to check your NIM balance and never accesses your private keys or seed
      phrase. Any NIM transaction requires your explicit confirmation through Nimiq Pay's
      native approval dialog.
    </p>

    <h2 class="text-lg font-semibold">Privacy</h2>
    <p class="text-slate-300">
      Camera scanning (when available) runs entirely on your device — no images are uploaded
      or stored. NimLens does not track you and stores no personal data.
    </p>

    <h2 class="text-lg font-semibold">Open source</h2>
    <p class="text-slate-300">
      NimLens is open source under the MIT license. The source code is included in this
      project's repository.
    </p>

    <h2 class="text-lg font-semibold">Credits</h2>
    <p class="text-slate-300">
      Exchange rates are provided by
      <a href="https://www.coingecko.com" class="underline" target="_blank" rel="noopener">CoinGecko</a>.
      On-device price scanning uses
      <a href="https://tesseract.projectnaptha.com" class="underline" target="_blank" rel="noopener">Tesseract.js</a>.
    </p>

    <template v-if="walletStore.isInsideNimiqPay && walletStore.address">
      <h2 class="text-lg font-semibold">Support NimLens</h2>
      <p class="text-slate-300">
        If NimLens is useful to you, you can send a small one-time tip to support development.
      </p>
      <button
        type="button"
        class="min-h-[44px] rounded-lg bg-emerald-600 px-4 font-medium"
        @click="walletStore.sendTip()"
      >
        Tip 5 NIM
      </button>
      <div v-if="walletStore.tipTxHash" class="text-emerald-400 text-sm">
        Thank you! Transaction: {{ walletStore.tipTxHash }}
      </div>
      <div v-if="walletStore.tipError" class="text-red-400 text-sm">
        Tip failed: {{ walletStore.tipError }}
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 9: Run the tests to verify they pass**

```bash
cd /home/maestro/Documents/projects/NimiqLens/frontend && npm run test
```
Expected: PASS

- [ ] **Step 10: Type-check and build**

```bash
cd /home/maestro/Documents/projects/NimiqLens/frontend && npm run build
```
Expected: builds cleanly with no TypeScript errors

- [ ] **Step 11: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add frontend/src/vite-env.d.ts frontend/src/stores/wallet.ts frontend/src/stores/wallet.test.ts frontend/src/views/AboutView.vue frontend/src/views/AboutView.test.ts
git commit -m "Add optional NIM tip button to the About screen"
```

---

### Task 2: Privacy policy

**Files:**
- Create: `docs/privacy.md`

- [ ] **Step 1: Write the privacy policy**

Create `docs/privacy.md`:

```markdown
# Privacy Policy

NimLens is a client-side Mini App. This page explains exactly what data NimLens
reads, what it does with it, and what it never does.

## Camera & OCR

- Camera access is only requested when you tap **"Start camera"** on the Scan
  screen — never automatically and never on page load.
- The camera frame is captured to an in-memory canvas and processed entirely
  on your device using [Tesseract.js](https://tesseract.projectnaptha.com), a
  WebAssembly OCR library that runs locally in your browser.
- **No image, frame, or photo is ever uploaded, transmitted, or stored** —
  on-device or remotely. Once the page is closed or reloaded, nothing remains.
- The text NimLens extracts from a scan is only ever used to pre-fill the
  price field on the Converter screen, and only after you confirm it.

## Wallet data

- NimLens only requests wallet access when you tap **"Connect Wallet"**.
- On connect, NimLens reads your NIM address via Nimiq Pay's `listAccounts()`.
  This requires your explicit approval in Nimiq Pay's native dialog.
- Your address is sent to the NimLens backend solely to look up your NIM
  balance (via a public Nimiq RPC node), so the app can tell you whether your
  balance covers a given price.
- NimLens never requests, reads, or stores your seed phrase or private keys.
- Any transaction (e.g. the optional tip) requires your explicit confirmation
  through Nimiq Pay's native approval dialog — NimLens never sends a
  transaction automatically.

## Exchange rate data

- Conversion rates (NIM, USDT, BTC, ETH vs. EUR/USD/GBP/CHF) are fetched from
  the NimLens backend, which sources them from
  [CoinGecko](https://www.coingecko.com) and caches them for 60 seconds.
- Fetching rates does not transmit any personal data — it is a public,
  unauthenticated request.

## Tracking & analytics

- NimLens does not use cookies, analytics, or tracking scripts of any kind.
- NimLens does not store any personal data, on-device or on its backend.

## Open source

NimLens is open source under the MIT license — you can review exactly what
the code does in this repository.
```

- [ ] **Step 2: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add docs/privacy.md
git commit -m "Add privacy policy"
```

---

### Task 3: Submission description

**Files:**
- Create: `docs/submission.md`

- [ ] **Step 1: Write the submission description**

Create `docs/submission.md`, using the ≤250-word description from the design spec (§11):

```markdown
# NimLens — Submission

**Repository:** https://github.com/<org>/nimlens <!-- TODO: replace with the real repo URL before submission -->

**License:** MIT

## Description

> **NimLens — see real-world prices in crypto, instantly.**
>
> NimLens is a Nimiq Pay Mini App that turns any fiat price into its
> equivalent in NIM, USDT, BTC, and ETH. Enter a price (or scan a price tag,
> receipt, or menu with your camera), pick your currency — EUR, USD, GBP, or
> CHF — and NimLens shows you what it's worth across major crypto assets in
> real time.
>
> It's built for everyday Nimiq Pay users who want a quick mental model of
> crypto value while shopping, comparing prices, or just curious what
> something costs "in NIM." Connect your wallet (one tap, via Nimiq Pay's
> account access) and NimLens tells you whether your current NIM balance
> covers the price — no guesswork.
>
> NimLens integrates with Nimiq Pay through the official Mini App SDK: wallet
> connection via `listAccounts()`, balance checks via a public Nimiq RPC, and
> an optional one-tap tip to support development via
> `sendBasicTransactionWithData()`. NimLens never accesses private keys, never
> handles seed phrases, and never custodies funds — every sensitive action
> goes through Nimiq Pay's native approval dialogs.
>
> Camera scanning runs OCR entirely on-device (Tesseract.js) — no images are
> ever uploaded or stored, and detected prices always require user
> confirmation before conversion.
>
> Exchange rates are sourced from CoinGecko via a small backend that
> normalizes and caches data for 60 seconds, with clear on-screen warnings if
> rates go stale.
>
> NimLens is fully open source under the MIT license.

## Screens

| Route | Screen |
| --- | --- |
| `/` | Welcome — connect wallet, start manual conversion or camera scan |
| `/convert` | Converter — price input, currency selector, NIM/USDT/BTC/ETH conversions, affordability |
| `/scan` | Camera Scan — on-device OCR price detection with confirm/edit |
| `/rates` | Rates — current rates table, timestamp, source attribution |
| `/about` | About — Nimiq Pay integration, privacy, credits, MIT license, optional tip |
```

- [ ] **Step 2: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add docs/submission.md
git commit -m "Add submission description"
```

---

### Task 4: Developer guide

**Files:**
- Create: `docs/dev-guide.md`

- [ ] **Step 1: Write the developer guide**

Create `docs/dev-guide.md`:

```markdown
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

Copy `.env.example` to `frontend/.env` and adjust `VITE_API_BASE_URL` to point
at your backend (e.g. `http://localhost:8787` for local dev, or your machine's
LAN IP when testing from a phone).

## Testing on a phone via Nimiq Pay (LAN)

Nimiq Pay Mini Apps must be loaded over your local network, not `localhost`,
so a phone can reach your dev server.

1. Find your machine's LAN IP address (e.g. `192.168.1.42`).
2. Set `VITE_API_BASE_URL=http://192.168.1.42:8787` in `frontend/.env` and
   restart `npm run dev`.
3. Set `ALLOWED_ORIGIN=http://192.168.1.42:5173` for the backend (or leave the
   default `*` for local development) and restart the backend.
4. On your phone, open Nimiq Pay and load
   `http://192.168.1.42:5173` as a Mini App.
5. Confirm `init()` succeeds (`isInsideNimiqPay` becomes `true`) and that
   "Connect Wallet" triggers the native `listAccounts()` approval dialog.

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
```

- [ ] **Step 2: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add docs/dev-guide.md
git commit -m "Add developer guide"
```

---

### Task 5: MIT license

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Write the MIT license**

Create `LICENSE`:

```
MIT License

Copyright (c) 2026 maestroi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add LICENSE
git commit -m "Add MIT license"
```

---

### Task 6: Root README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the root README**

Create `README.md`:

```markdown
# NimLens

NimLens is a mobile-first [Nimiq Pay](https://nimiq.com/pay) Mini App that
turns any fiat price into its equivalent in NIM, USDT, BTC, and ETH. Enter a
price — or scan one with your camera — pick a currency (EUR, USD, GBP, CHF),
and see what it's worth in crypto.

NimLens is open source (MIT), does not custody funds, does not handle seed
phrases, and only requests wallet or camera access on explicit user action.

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
entirely on-device and are never uploaded or stored; wallet data is only read
on explicit "Connect Wallet" action.

## Credits

- Exchange rates: [CoinGecko](https://www.coingecko.com)
- On-device OCR: [Tesseract.js](https://tesseract.projectnaptha.com)
- Wallet integration: [@nimiq/mini-app-sdk](https://nimiq.dev)

## License

[MIT](LICENSE)
```

- [ ] **Step 2: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add README.md
git commit -m "Add root README"
```

---

### Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suites**

```bash
cd /home/maestro/Documents/projects/NimiqLens/frontend && npm run test
cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...
```
Expected: PASS for both

- [ ] **Step 2: Build the frontend**

```bash
cd /home/maestro/Documents/projects/NimiqLens/frontend && npm run build
```
Expected: builds cleanly with no TypeScript errors

- [ ] **Step 3: On-device tip flow check**

Inside Nimiq Pay on a phone (per `docs/dev-guide.md`'s LAN setup):
- Connect a wallet on the Welcome screen.
- Go to the About screen and confirm the "Tip 5 NIM" button is now visible.
- Tap it and confirm Nimiq Pay's native approval dialog appears for
  `sendBasicTransactionWithData` — do **not** complete the transaction unless
  you intend to send a real tip.
- Confirm the button is hidden again if you reload the app without
  reconnecting the wallet (i.e. it only appears once `address` is set).

No commit for this task — it is verification of the work committed in
Tasks 1-6. If any step fails, fix the issue in the relevant task's files,
re-run that task's tests, and commit the fix separately.

---

## Self-Review Notes

- **Spec coverage (§4 tip button):** shown only when `isInsideNimiqPay && address` (Task 1, `AboutView.vue` `v-if`); explicit button press only, calls `sendBasicTransactionWithData({ recipient: VITE_TIP_ADDRESS, value, data: "NimLens tip" })` (Task 1, `sendTip()`); recipient comes from `VITE_TIP_ADDRESS`, which `.env.example` already sets to the confirmed real address — no change needed there.
- **Spec coverage (§9 compliance & repo contents):** `LICENSE` (MIT, Task 5); `docs/privacy.md` (Task 2, covers camera/OCR local-only, no image storage, no tracking, and what wallet data is read); `docs/submission.md` (Task 3, ≤250-word description from §11 plus screen table); `docs/dev-guide.md` (Task 4, local setup + LAN phone testing + docker-compose); root `README.md` credits CoinGecko and Tesseract.js with links (Task 6); About screen also credits CoinGecko/Tesseract.js (Task 1, Step 8).
- **Type consistency:** `TIP_AMOUNT_LUNA` is exported from `wallet.ts` and imported by `wallet.test.ts`; `sendTip()` sets `tipTxHash: string | null` and `tipError: string | null`, both initialized to `null` in state and read in `AboutView.vue`'s template guards.
- **Placeholders:** `docs/submission.md` contains one explicit `<!-- TODO -->` for the GitHub repo URL, per the "placeholder for now" decision — this is the only intentional placeholder in this plan and is called out inline so it isn't missed before submission.
- **Out of scope for this plan:** Phase 5 (testing & submission) covers the full Mini Apps `checklist.md` pass, mobile-viewport and virtual-device testing, and final submission prep — not duplicated here.
