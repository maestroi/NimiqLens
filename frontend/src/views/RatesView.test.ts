import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RatesView from './RatesView.vue'
import { useRatesStore } from '../stores/rates'
import type { RatesResponse } from '../lib/api'

const sampleRates: RatesResponse = {
  rates: {
    NIM: { EUR: 0.01, USD: 0.011, GBP: 0.009, CHF: 0.0095 },
    USDT: { EUR: 0.92, USD: 1.0, GBP: 0.79, CHF: 0.88 },
    BTC: { EUR: 55000, USD: 64000, GBP: 48000, CHF: 51000 },
    ETH: { EUR: 1400, USD: 1600, GBP: 1200, CHF: 1300 },
  },
  timestamp: '2026-06-13T16:30:00Z',
  fetched_at: new Date().toISOString(),
  stale: false,
  source: 'CoinGecko',
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('RatesView', () => {
  it('shows the rates table, source, and timestamp when rates are loaded', () => {
    const ratesStore = useRatesStore()
    ratesStore.$patch({ rates: sampleRates })

    const wrapper = mount(RatesView)
    const text = wrapper.text()

    expect(text).toContain('NIM')
    expect(text).toContain('BTC')
    expect(text).toContain('ETH')
    expect(text).toContain('USDT')
    expect(text).toContain('CoinGecko')
  })

  it('shows the stale banner when rates are stale', () => {
    const ratesStore = useRatesStore()
    ratesStore.$patch({ rates: { ...sampleRates, stale: true } })

    const wrapper = mount(RatesView)

    expect(wrapper.text()).toContain('may be outdated')
  })

  it('shows an unavailable message when loading failed with no cached rates', () => {
    const ratesStore = useRatesStore()
    ratesStore.$patch({ rates: null, error: 'rates request failed: 503' })

    const wrapper = mount(RatesView)

    expect(wrapper.text()).toContain('unavailable')
  })
})
