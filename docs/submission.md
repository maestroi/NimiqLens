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
