<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWalletStore } from '../stores/wallet'
import { useRatesStore } from '../stores/rates'
import { convertNimBalanceToFiat, FIAT_CURRENCIES } from '../lib/convert'
import IconHexagon from '../components/icons/IconHexagon.vue'
import IconExchange from '../components/icons/IconExchange.vue'
import IconQr from '../components/icons/IconQr.vue'
import IconAlert from '../components/icons/IconAlert.vue'
import IconLock from '../components/icons/IconLock.vue'
import IconSpinner from '../components/icons/IconSpinner.vue'

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
  <div class="min-h-screen p-4 pb-28 flex flex-col gap-4">
    <div class="flex items-center gap-3">
      <IconHexagon class="h-9 w-9" />
      <div>
        <h1 class="text-2xl font-bold leading-tight">NimLens</h1>
        <p class="text-sm text-nimiq-muted">See your wallet, convert any price to crypto.</p>
      </div>
    </div>

    <div
      v-if="walletStore.connecting"
      class="rounded-2xl border border-nimiq-border bg-nimiq-card px-4 py-5 flex items-center gap-3"
    >
      <IconSpinner class="h-5 w-5 shrink-0 text-nimiq-blue-light" />
      <div>
        <p class="font-medium">Connecting to your wallet…</p>
        <p class="mt-1 text-sm text-nimiq-muted">Approve account access in Nimiq Pay to load your balance.</p>
      </div>
    </div>

    <div
      v-else-if="!walletStore.initialized"
      class="rounded-2xl border border-nimiq-border bg-nimiq-card px-4 py-5 flex items-center gap-3"
    >
      <IconSpinner class="h-5 w-5 shrink-0 text-nimiq-blue-light" />
      <div>
        <p class="font-medium">Starting Nimiq Pay…</p>
        <p class="mt-1 text-sm text-nimiq-muted">Waiting for the wallet provider.</p>
      </div>
    </div>

    <section
      v-else-if="walletStore.address"
      class="overflow-hidden rounded-2xl border border-white/10 bg-nimiq-card"
    >
      <div class="bg-gradient-to-br from-nimiq-blue to-nimiq-green-light px-4 py-5 text-white">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">Wallet balance</p>
        <p v-if="walletStore.balanceLoading" class="mt-1 text-sm opacity-80">Updating balance…</p>
        <p v-else-if="formattedBalance !== null" class="mt-1 text-4xl font-bold">{{ formattedBalance }} NIM</p>
        <p v-else-if="walletStore.balanceError" class="mt-1 flex items-center gap-2 text-sm text-white/90">
          <IconAlert class="h-4 w-4 shrink-0" />
          Balance unavailable: {{ walletStore.balanceError }}
        </p>
        <p v-else class="mt-1 font-medium">Balance unavailable</p>
        <p class="mt-2 text-sm opacity-80">{{ walletStore.shortAddress }}</p>
        <p v-if="walletStore.lockedBalanceNim" class="mt-2 flex items-center gap-1.5 text-sm font-medium opacity-90">
          <IconLock class="h-3.5 w-3.5 shrink-0" />
          {{ walletStore.lockedBalanceNim.toFixed(2) }} NIM is currently locked in swaps
        </p>
      </div>

      <div v-if="fiatValues" class="grid grid-cols-2 gap-px bg-nimiq-border">
        <div
          v-for="currency in FIAT_CURRENCIES"
          :key="currency"
          class="bg-nimiq-card px-4 py-3"
        >
          <p class="text-xs text-nimiq-muted">{{ currency }}</p>
          <p class="text-lg font-semibold">{{ currency }} {{ fiatValues[currency].toFixed(2) }}</p>
        </div>
      </div>
      <p v-else-if="ratesStore.loading" class="px-4 py-3 text-sm text-nimiq-muted">
        Loading conversion rates…
      </p>
      <p v-else class="flex items-center gap-2 px-4 py-3 text-sm text-nimiq-gold-light">
        <IconAlert class="h-4 w-4 shrink-0" />
        Fiat values are temporarily unavailable.
      </p>

      <div class="flex flex-col gap-2 border-t border-nimiq-border px-4 py-3">
        <p v-if="walletStore.sessionRestored" class="text-xs text-nimiq-muted">
          Using saved wallet access — no re-approval needed for balance checks.
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="min-h-[44px] flex-1 rounded-lg bg-nimiq-card-elevated px-3 text-sm font-medium transition-colors duration-200 hover:bg-white/10 disabled:opacity-50 cursor-pointer"
            :disabled="walletStore.balanceLoading || walletStore.connecting"
            @click="refreshBalance()"
          >
            {{ walletStore.balanceLoading ? 'Refreshing…' : 'Refresh balance' }}
          </button>
          <button
            type="button"
            class="min-h-[44px] flex-1 rounded-lg bg-nimiq-card-elevated px-3 text-sm font-medium transition-colors duration-200 hover:bg-white/10 disabled:opacity-50 cursor-pointer"
            :disabled="walletStore.connecting || walletStore.balanceLoading"
            @click="reconnectWallet()"
          >
            {{ walletStore.connecting ? 'Reconnecting…' : 'Reconnect' }}
          </button>
        </div>
        <button
          type="button"
          class="min-h-[44px] rounded-lg px-3 text-sm text-nimiq-muted transition-colors duration-200 hover:text-white cursor-pointer"
          @click="walletStore.disconnect()"
        >
          Forget saved wallet
        </button>
      </div>
    </section>

    <div
      v-else-if="walletStore.isInsideNimiqPay"
      class="rounded-2xl border border-nimiq-gold/30 bg-nimiq-gold/10 px-4 py-4"
    >
      <p class="flex items-center gap-2 font-medium">
        <IconAlert class="h-4 w-4 shrink-0 text-nimiq-gold-light" />
        Wallet access is needed
      </p>
      <p v-if="walletStore.connectionError" class="mt-1 text-sm text-nimiq-gold-light">
        {{ walletStore.connectionError }}
      </p>
      <p v-else class="mt-1 text-sm text-nimiq-gold-light">
        Approve account access to see your NIM balance and fiat values.
      </p>
      <button
        type="button"
        class="mt-3 min-h-[44px] w-full rounded-lg bg-nimiq-green-light px-4 font-semibold text-nimiq-darkerblue transition-colors duration-200 hover:brightness-110 cursor-pointer"
        @click="walletStore.connect()"
      >
        {{ walletStore.connectionError ? 'Try Again' : 'Show wallet balance' }}
      </button>
    </div>

    <p v-else class="text-sm text-nimiq-muted">
      Open this app inside Nimiq Pay to connect your wallet.
    </p>

    <router-link
      to="/convert"
      class="min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-nimiq-card px-4 py-3 font-medium text-center transition-colors duration-200 hover:bg-nimiq-card-elevated cursor-pointer"
    >
      <IconExchange class="h-4 w-4 text-nimiq-blue-light" />
      Start manual conversion
    </router-link>
    <router-link
      to="/scan"
      class="min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-nimiq-card px-4 py-3 font-medium text-center transition-colors duration-200 hover:bg-nimiq-card-elevated cursor-pointer"
    >
      <IconQr class="h-4 w-4 text-nimiq-blue-light" />
      Start camera scan
    </router-link>
  </div>
</template>
