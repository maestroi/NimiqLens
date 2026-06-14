<script setup lang="ts">
import { onMounted } from 'vue'
import { useRatesStore } from '../stores/rates'
import { ASSETS, FIAT_CURRENCIES, formatFiatRate } from '../lib/convert'
import AssetIcon from '../components/icons/AssetIcon.vue'
import IconChart from '../components/icons/IconChart.vue'
import IconAlert from '../components/icons/IconAlert.vue'

const ratesStore = useRatesStore()

onMounted(() => {
  if (!ratesStore.rates) ratesStore.load()
})
</script>

<template>
  <div class="min-h-screen p-4 pb-28">
    <div class="flex items-center gap-2 mb-2">
      <IconChart class="h-6 w-6 text-nimiq-blue-light" />
      <h1 class="text-2xl font-bold">Exchange Rates</h1>
    </div>
    <p class="mb-4 text-sm text-nimiq-muted">Price of 1 unit in each fiat currency.</p>

    <div v-if="ratesStore.rates">
      <div
        v-if="ratesStore.isStale"
        class="mb-4 flex items-center gap-2 rounded-lg border border-nimiq-gold/30 bg-nimiq-gold/10 px-3 py-2 text-sm text-nimiq-gold-light"
      >
        <IconAlert class="h-4 w-4 shrink-0" />
        These rates may be outdated.
      </div>

      <div class="flex flex-col gap-3 mb-4">
        <section
          v-for="asset in ASSETS"
          :key="asset"
          class="rounded-xl border border-nimiq-border bg-nimiq-card p-4"
        >
          <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold text-nimiq-green-light">
            <AssetIcon :asset="asset" class="h-6 w-6" />
            1 {{ asset }}
          </h2>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="currency in FIAT_CURRENCIES"
              :key="currency"
              class="rounded-lg bg-nimiq-card-elevated px-3 py-3"
            >
              <p class="text-xs font-medium uppercase tracking-wide text-nimiq-muted">{{ currency }}</p>
              <p class="mt-1 text-lg font-semibold tabular-nums text-white">
                {{ formatFiatRate(asset, ratesStore.rates.rates[asset][currency]) }}
              </p>
            </div>
          </div>
        </section>
      </div>

      <p class="text-sm text-nimiq-muted">
        Last updated: {{ new Date(ratesStore.rates.fetched_at).toLocaleString() }}
      </p>
      <p class="text-sm text-nimiq-muted">Source: {{ ratesStore.rates.source }}</p>
    </div>
    <p v-else-if="ratesStore.error" class="flex items-center gap-2 text-nimiq-red-light">
      <IconAlert class="h-4 w-4 shrink-0" />
      Rates unavailable — try again later
    </p>
    <p v-else class="text-nimiq-muted">Loading rates…</p>
  </div>
</template>
