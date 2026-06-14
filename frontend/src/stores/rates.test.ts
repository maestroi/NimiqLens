import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRatesStore } from './rates'
import * as api from '../lib/api'

const sampleRates: api.RatesResponse = {
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
  vi.restoreAllMocks()
})

describe('useRatesStore', () => {
  it('loads rates and is not stale right after loading', async () => {
    vi.spyOn(api, 'fetchRates').mockResolvedValue(sampleRates)

    const store = useRatesStore()
    await store.load()

    expect(store.rates?.source).toBe('CoinGecko')
    expect(store.error).toBeNull()
    expect(store.isStale).toBe(false)
  })

  it('records an error and leaves rates null when the fetch fails', async () => {
    vi.spyOn(api, 'fetchRates').mockRejectedValue(new Error('rates request failed: 503'))

    const store = useRatesStore()
    await store.load()

    expect(store.rates).toBeNull()
    expect(store.error).toBe('rates request failed: 503')
  })

  it('treats rates as stale once the backend marks them stale', async () => {
    vi.spyOn(api, 'fetchRates').mockResolvedValue({ ...sampleRates, stale: true })

    const store = useRatesStore()
    await store.load()

    expect(store.isStale).toBe(true)
  })

  it('treats rates as stale once fetched_at is older than 60 seconds', async () => {
    const old = new Date(Date.now() - 61_000).toISOString()
    vi.spyOn(api, 'fetchRates').mockResolvedValue({ ...sampleRates, fetched_at: old })

    const store = useRatesStore()
    await store.load()

    expect(store.isStale).toBe(true)
  })
})
