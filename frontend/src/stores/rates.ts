import { defineStore } from 'pinia'
import { fetchRates, type RatesResponse } from '../lib/api'

const STALE_AFTER_MS = 5 * 60_000
const RATES_REFRESH_AFTER_MS = 45_000

let refreshTimer: ReturnType<typeof setTimeout> | null = null

function clearRefreshTimer() {
  if (!refreshTimer) return
  clearTimeout(refreshTimer)
  refreshTimer = null
}

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
    scheduleRefresh() {
      clearRefreshTimer()
      refreshTimer = setTimeout(() => {
        void this.load()
      }, RATES_REFRESH_AFTER_MS)
    },
    async load() {
      if (this.loading) return
      this.loading = true
      this.error = null
      try {
        this.rates = await fetchRates()
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      } finally {
        this.loading = false
        this.scheduleRefresh()
      }
    },
  },
})
