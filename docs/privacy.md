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

- When you ask to show your wallet balance, NimLens requests your NIM address
  via `listAccounts()` so it can show your balance and approximate fiat values.
  This requires your approval in Nimiq Pay's native dialog.
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
