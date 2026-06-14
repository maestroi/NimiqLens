<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRatesStore } from '../stores/rates'
import { useWalletStore } from '../stores/wallet'
import { useScanStore } from '../stores/scan'
import { ASSETS, FIAT_CURRENCIES, computeAssetAmount, formatAssetAmount, type Asset, type FiatCurrency } from '../lib/convert'
import { affordability } from '../lib/affordability'

const ratesStore = useRatesStore()
const walletStore = useWalletStore()
const scanStore = useScanStore()

const price = ref<number | null>(null)
const currency = ref<FiatCurrency>('EUR')

onMounted(() => {
  if (!ratesStore.rates) ratesStore.load()

  if (scanStore.pendingPrice !== null && scanStore.pendingCurrency !== null) {
    price.value = scanStore.pendingPrice
    currency.value = scanStore.pendingCurrency
    scanStore.clearPending()
  }
})

const conversions = computed((): Record<Asset, string> | null => {
  const rates = ratesStore.rates
  if (!rates || price.value === null || price.value <= 0) return null

  const result = {} as Record<Asset, string>
  for (const asset of ASSETS) {
    const rate = rates.rates[asset][currency.value]
    result[asset] = formatAssetAmount(asset, computeAssetAmount(price.value, rate))
  }
  return result
})

const nimAmountNeeded = computed((): number | null => {
  const rates = ratesStore.rates
  if (!rates || price.value === null || price.value <= 0) return null
  return computeAssetAmount(price.value, rates.rates.NIM[currency.value])
})

const affordabilityResult = computed(() => {
  if (nimAmountNeeded.value === null) return null
  return affordability(walletStore.spendableBalanceNim ?? walletStore.balanceNim, nimAmountNeeded.value)
})

const spendableBalance = computed(() => walletStore.spendableBalanceNim ?? walletStore.balanceNim)

function formatNim(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m`
}
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <h1 class="text-2xl font-bold mb-4">Price Lens</h1>

    <div
      v-if="ratesStore.isStale"
      class="mb-4 rounded-lg bg-amber-900/40 border border-amber-600 px-3 py-2 text-sm text-amber-200"
    >
      Rates from {{ ratesStore.rates ? relativeTime(ratesStore.rates.fetched_at) : 'an unknown time' }} ago — may be outdated
    </div>
    <div
      v-else-if="ratesStore.error && !ratesStore.rates"
      class="mb-4 rounded-lg bg-red-900/40 border border-red-600 px-3 py-2 text-sm text-red-200"
    >
      Rates unavailable — try again later
    </div>

    <div class="flex gap-2 mb-4">
      <input
        v-model.number="price"
        type="number"
        inputmode="decimal"
        min="0"
        step="0.01"
        placeholder="0.00"
        class="flex-1 min-h-[44px] rounded-lg bg-slate-800 px-3 text-xl"
      />
      <select v-model="currency" class="min-h-[44px] rounded-lg bg-slate-800 px-3 text-xl">
        <option v-for="c in FIAT_CURRENCIES" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <p v-if="ratesStore.loading && !ratesStore.rates" class="mb-4 text-slate-400">
      Loading rates…
    </p>

    <div v-if="conversions" class="grid grid-cols-2 gap-3 mb-4">
      <div v-for="asset in ASSETS" :key="asset" class="rounded-xl bg-slate-800 p-4">
        <div class="text-sm text-slate-400">{{ asset }}</div>
        <div class="text-2xl font-semibold">{{ conversions[asset] }}</div>
      </div>
    </div>

    <div v-if="affordabilityResult" class="rounded-xl bg-slate-800 p-4">
      <div v-if="affordabilityResult.affordable" class="text-emerald-400 font-medium">
        You can afford this with your NIM balance
      </div>
      <div v-else class="text-amber-400 font-medium">
        You need ≈ {{ formatNim(affordabilityResult.deficit) }} more NIM
      </div>
      <p v-if="nimAmountNeeded !== null" class="mt-2 text-sm text-slate-300">
        Price requires ≈ {{ formatNim(nimAmountNeeded) }} NIM
      </p>
      <p v-if="spendableBalance !== null" class="mt-1 text-sm text-slate-300">
        You have {{ formatNim(spendableBalance) }} spendable NIM
      </p>
      <p v-if="walletStore.lockedBalanceNim" class="mt-1 text-sm text-slate-400">
        {{ formatNim(walletStore.lockedBalanceNim) }} NIM is locked and cannot currently be spent
      </p>
    </div>
    <div
      v-else-if="walletStore.address && walletStore.balanceError"
      class="rounded-xl bg-slate-800 p-4 text-slate-400"
    >
      Balance unavailable
    </div>
  </div>
</template>
