import { describe, expect, it, vi } from 'vitest'
import { fetchBalanceFromProvider, lunaToNim } from './balance'

const ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'

describe('lunaToNim', () => {
  it('converts luna to NIM', () => {
    expect(lunaToNim(100_000_000)).toBe(1000)
  })
})

describe('fetchBalanceFromProvider', () => {
  it('reads balance via the Nimiq Pay provider RPC', async () => {
    const call = vi.fn()
      .mockResolvedValueOnce({
        address: ADDRESS,
        balance: 100_000_000,
        type: 'basic',
      })
      .mockResolvedValueOnce([])
    const provider = {
      getRPC: () => ({ call }),
    }

    const result = await fetchBalanceFromProvider(provider as any, ADDRESS)

    expect(result.balance_nim).toBe(1_000)
    expect(result.total_nim).toBe(1_000)
    expect(result.locked_nim).toBe(0)
    expect(result.address).toBe(ADDRESS)
  })

  it('includes active HTLC balances owned by the connected wallet', async () => {
    const htlcAddress = 'NQ07 6K62 9VHR 3FRP 4BU7 Q802 K1ST 9GBH BS4K'
    const call = vi.fn()
      .mockResolvedValueOnce({ address: ADDRESS, balance: 0, type: 'basic' })
      .mockResolvedValueOnce([{
        relatedAddresses: [ADDRESS, htlcAddress],
      }])
      .mockResolvedValueOnce({
        address: htlcAddress,
        balance: 100_079_983,
        type: 'htlc',
        sender: ADDRESS,
      })

    const result = await fetchBalanceFromProvider({ getRPC: () => ({ call }) } as any, ADDRESS)

    expect(result.balance_nim).toBe(0)
    expect(result.total_nim).toBeCloseTo(1000.79983)
    expect(result.locked_nim).toBeCloseTo(1000.79983)
  })

  it('throws when provider RPC is unavailable', async () => {
    await expect(fetchBalanceFromProvider({ getRPC: () => undefined } as any, ADDRESS))
      .rejects.toThrow('Wallet RPC unavailable')
  })
})
