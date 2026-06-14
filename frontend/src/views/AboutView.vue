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
      When you ask to see your wallet balance, NimLens requests account access and then shows
      your NIM balance and approximate fiat values. Account access and every NIM transaction
      require your approval through Nimiq Pay's native dialogs. NimLens never accesses your
      private keys or seed phrase.
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
