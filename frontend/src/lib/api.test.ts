import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchRates, fetchBalance, resolveApiBase } from './api'

const sampleRates = {
  rates: {
    NIM: { EUR: 0.01, USD: 0.011, GBP: 0.009, CHF: 0.0095 },
    USDT: { EUR: 0.92, USD: 1.0, GBP: 0.79, CHF: 0.88 },
    BTC: { EUR: 55000, USD: 64000, GBP: 48000, CHF: 51000 },
    ETH: { EUR: 1400, USD: 1600, GBP: 1200, CHF: 1300 },
  },
  timestamp: '2026-06-13T16:30:00Z',
  fetched_at: '2026-06-13T16:30:00Z',
  stale: false,
  source: 'CoinGecko',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveApiBase', () => {
  it('uses same-origin requests in dev mode', () => {
    expect(resolveApiBase()).toBe('')
  })
})

describe('fetchRates', () => {
  it('returns parsed rates on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(sampleRates), { status: 200 })))

    const result = await fetchRates()
    expect(result.source).toBe('CoinGecko')
    expect(result.rates.NIM.EUR).toBe(0.01)
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))

    await expect(fetchRates()).rejects.toThrow('rates request failed: 503')
  })
})

describe('fetchBalance', () => {
  it('returns parsed balance on success', async () => {
    const body = { address: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000', balance_nim: 123.45 }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })))

    const result = await fetchBalance('NQ07 0000 0000 0000 0000 0000 0000 0000 0000')
    expect(result.balance_nim).toBe(123.45)
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))

    await expect(fetchBalance('NQ07')).rejects.toThrow('balance request failed: 503')
  })
})
