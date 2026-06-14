# Wallet Startup Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Nimiq Pay wallet connection and show the wallet's NIM balance converted to EUR, USD, GBP, and CHF on the home screen.

**Architecture:** `walletStore.init()` initializes and stores the injected provider without proxying its private fields. A clear home-screen action starts account approval and balance loading. A pure conversion helper converts a NIM balance using the existing rates response, while `WelcomeView` loads rates and renders connection, loading, error, retry, and wallet-overview states.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest, Nimiq Mini App SDK

---

### Task 1: Automatic Wallet Connection

**Files:**
- Modify: `frontend/src/stores/wallet.test.ts`
- Modify: `frontend/src/stores/wallet.ts`

- [ ] Add failing tests proving `init()` requests accounts and loads balance, and records a connection error on rejection.
- [ ] Run `npm test -- src/stores/wallet.test.ts` and verify the new tests fail.
- [ ] Add `connecting` and `connectionError` state, make `init()` call `connect()`, and make `connect()` handle provider errors.
- [ ] Run the wallet-store tests and verify they pass.

### Task 2: Wallet Balance Conversion

**Files:**
- Modify: `frontend/src/lib/convert.test.ts`
- Modify: `frontend/src/lib/convert.ts`

- [ ] Add a failing test proving a NIM balance converts to all supported fiat currencies.
- [ ] Run the conversion tests and verify the new test fails.
- [ ] Add the minimal pure `convertNimBalanceToFiat()` helper.
- [ ] Run the conversion tests and verify they pass.

### Task 3: Home Wallet Overview

**Files:**
- Create: `frontend/src/views/WelcomeView.test.ts`
- Modify: `frontend/src/views/WelcomeView.vue`

- [ ] Add failing component tests for loading, connected balance conversions, and retry behavior.
- [ ] Run the Welcome view tests and verify they fail.
- [ ] Load rates on mount and render the wallet summary, loading state, connection failure with retry, and standalone-browser message.
- [ ] Run the Welcome view tests and verify they pass.

### Task 4: Verification

**Files:**
- Verify: `frontend/`

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Review the final diff for scope and consistency.
