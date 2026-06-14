import { defineStore } from 'pinia'
import { fetchRates, type RatesResponse } from '../lib/api'

const STALE_AFTER_MS = 60_000

export const useRatesStore = defineStore('rates', {
  state: () => ({
    rates: null as RatesResponse | null,
    error: null as string | null,
    loading: false,
  }),
  getters: {
    isStale(state): boolean {
      if (!state.rates) return false
      if (state.rates.stale) return true
      return Date.now() - new Date(state.rates.fetched_at).getTime() > STALE_AFTER_MS
    },
  },
  actions: {
    async load() {
      this.loading = true
      this.error = null
      try {
        this.rates = await fetchRates()
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      } finally {
        this.loading = false
      }
    },
  },
})
