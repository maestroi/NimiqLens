<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWalletStore } from '../stores/wallet'
import { useRatesStore } from '../stores/rates'
import { convertNimBalanceToFiat, FIAT_CURRENCIES } from '../lib/convert'

const walletStore = useWalletStore()
const ratesStore = useRatesStore()

onMounted(() => {
  if (!ratesStore.rates) ratesStore.load()
})

const fiatValues = computed(() => {
  if (walletStore.balanceNim === null || !ratesStore.rates) return null
  return convertNimBalanceToFiat(walletStore.balanceNim, ratesStore.rates.rates.NIM)
})

const formattedBalance = computed(() => {
  if (walletStore.balanceNim === null) return null
  return walletStore.balanceNim.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
})

async function refreshBalance() {
  await walletStore.loadBalance()
}

async function reconnectWallet() {
  await walletStore.connect()
}
</script>

<template>
  <div class="min-h-screen p-4 pb-24 flex flex-col gap-4">
    <h1 class="text-3xl font-bold">NimLens</h1>
    <p class="text-slate-300">See what your wallet is worth, then convert real-world prices to crypto.</p>

    <div
      v-if="walletStore.connecting"
      class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-5"
    >
      <p class="font-medium">Connecting to your wallet…</p>
      <p class="mt-1 text-sm text-slate-400">Approve account access in Nimiq Pay to load your balance.</p>
    </div>

    <div
      v-else-if="!walletStore.initialized"
      class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-5"
    >
      <p class="font-medium">Starting Nimiq Pay…</p>
      <p class="mt-1 text-sm text-slate-400">Waiting for the wallet provider.</p>
    </div>

    <section
      v-else-if="walletStore.address"
      class="overflow-hidden rounded-2xl border border-emerald-400/20 bg-slate-900"
    >
      <div class="bg-emerald-400 px-4 py-5 text-slate-950">
        <p class="text-xs font-semibold uppercase tracking-[0.2em]">Wallet balance</p>
        <p v-if="walletStore.balanceLoading" class="mt-1 text-sm opacity-80">Updating balance…</p>
        <p v-else-if="formattedBalance !== null" class="mt-1 text-4xl font-bold">{{ formattedBalance }} NIM</p>
        <p v-else-if="walletStore.balanceError" class="mt-1 text-sm text-amber-200">
          Balance unavailable: {{ walletStore.balanceError }}
        </p>
        <p v-else class="mt-1 font-medium">Balance unavailable</p>
        <p class="mt-2 text-sm opacity-70">{{ walletStore.shortAddress }}</p>
        <p v-if="walletStore.lockedBalanceNim" class="mt-2 text-sm font-medium opacity-80">
          {{ walletStore.lockedBalanceNim.toFixed(2) }} NIM is currently locked in swaps
        </p>
      </div>

      <div v-if="fiatValues" class="grid grid-cols-2 gap-px bg-slate-700">
        <div
          v-for="currency in FIAT_CURRENCIES"
          :key="currency"
          class="bg-slate-900 px-4 py-3"
        >
          <p class="text-xs text-slate-400">{{ currency }}</p>
          <p class="text-lg font-semibold">{{ currency }} {{ fiatValues[currency].toFixed(2) }}</p>
        </div>
      </div>
      <p v-else-if="ratesStore.loading" class="px-4 py-3 text-sm text-slate-400">
        Loading conversion rates…
      </p>
      <p v-else class="px-4 py-3 text-sm text-amber-300">
        Fiat values are temporarily unavailable.
      </p>

      <div class="flex flex-col gap-2 border-t border-slate-800 px-4 py-3">
        <p v-if="walletStore.sessionRestored" class="text-xs text-slate-400">
          Using saved wallet access — no re-approval needed for balance checks.
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="min-h-[44px] flex-1 rounded-lg bg-slate-800 px-3 text-sm font-medium disabled:opacity-50"
            :disabled="walletStore.balanceLoading || walletStore.connecting"
            @click="refreshBalance()"
          >
            {{ walletStore.balanceLoading ? 'Refreshing…' : 'Refresh balance' }}
          </button>
          <button
            type="button"
            class="min-h-[44px] flex-1 rounded-lg bg-slate-800 px-3 text-sm font-medium disabled:opacity-50"
            :disabled="walletStore.connecting || walletStore.balanceLoading"
            @click="reconnectWallet()"
          >
            {{ walletStore.connecting ? 'Reconnecting…' : 'Reconnect' }}
          </button>
        </div>
        <button
          type="button"
          class="min-h-[44px] rounded-lg px-3 text-sm text-slate-400"
          @click="walletStore.disconnect()"
        >
          Forget saved wallet
        </button>
      </div>
    </section>

    <div
      v-else-if="walletStore.isInsideNimiqPay"
      class="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-4"
    >
      <p class="font-medium">Wallet access is needed</p>
      <p v-if="walletStore.connectionError" class="mt-1 text-sm text-amber-200">
        {{ walletStore.connectionError }}
      </p>
      <p v-else class="mt-1 text-sm text-amber-200">
        Approve account access to see your NIM balance and fiat values.
      </p>
      <button
        type="button"
        class="mt-3 min-h-[44px] w-full rounded-lg bg-emerald-500 px-4 font-semibold text-slate-950"
        @click="walletStore.connect()"
      >
        {{ walletStore.connectionError ? 'Try Again' : 'Show wallet balance' }}
      </button>
    </div>

    <p v-else class="text-slate-400 text-sm">
      Open this app inside Nimiq Pay to connect your wallet.
    </p>

    <router-link
      to="/convert"
      class="min-h-[44px] rounded-lg bg-slate-800 px-4 py-3 font-medium text-center flex items-center justify-center"
    >
      Start manual conversion
    </router-link>
    <router-link
      to="/scan"
      class="min-h-[44px] rounded-lg bg-slate-800 px-4 py-3 font-medium text-center flex items-center justify-center"
    >
      Start camera scan
    </router-link>
  </div>
</template>
