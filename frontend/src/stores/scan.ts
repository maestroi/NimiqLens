import { defineStore } from 'pinia'
import type { FiatCurrency } from '../lib/convert'

export const useScanStore = defineStore('scan', {
  state: () => ({
    pendingPrice: null as number | null,
    pendingCurrency: null as FiatCurrency | null,
  }),
  actions: {
    setPending(price: number, currency: FiatCurrency) {
      this.pendingPrice = price
      this.pendingCurrency = currency
    },
    clearPending() {
      this.pendingPrice = null
      this.pendingCurrency = null
    },
  },
})
