<script setup lang="ts">
import { onMounted } from 'vue'
import { useRatesStore } from '../stores/rates'
import { ASSETS, FIAT_CURRENCIES, formatFiatRate } from '../lib/convert'

const ratesStore = useRatesStore()

onMounted(() => {
  if (!ratesStore.rates) ratesStore.load()
})
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <h1 class="text-2xl font-bold mb-2">Exchange Rates</h1>
    <p class="mb-4 text-sm text-slate-400">Price of 1 unit in each fiat currency.</p>

    <div v-if="ratesStore.rates">
      <div
        v-if="ratesStore.isStale"
        class="mb-4 rounded-lg bg-amber-900/40 border border-amber-600 px-3 py-2 text-sm text-amber-200"
      >
        These rates may be outdated.
      </div>

      <div class="flex flex-col gap-3 mb-4">
        <section
          v-for="asset in ASSETS"
          :key="asset"
          class="rounded-xl border border-slate-700 bg-slate-800 p-4"
        >
          <h2 class="mb-3 text-lg font-semibold text-emerald-400">1 {{ asset }}</h2>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="currency in FIAT_CURRENCIES"
              :key="currency"
              class="rounded-lg bg-slate-900 px-3 py-3"
            >
              <p class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ currency }}</p>
              <p class="mt-1 text-lg font-semibold tabular-nums text-white">
                {{ formatFiatRate(asset, ratesStore.rates.rates[asset][currency]) }}
              </p>
            </div>
          </div>
        </section>
      </div>

      <p class="text-sm text-slate-400">
        Last updated: {{ new Date(ratesStore.rates.fetched_at).toLocaleString() }}
      </p>
      <p class="text-sm text-slate-400">Source: {{ ratesStore.rates.source }}</p>
    </div>
    <p v-else-if="ratesStore.error" class="text-red-300">Rates unavailable — try again later</p>
    <p v-else class="text-slate-400">Loading rates…</p>
  </div>
</template>
