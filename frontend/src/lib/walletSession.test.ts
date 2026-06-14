import { describe, expect, it, beforeEach } from 'vitest'
import {
  isLikelyNimiqAddress,
  readCachedWalletAddress,
  writeCachedWalletAddress,
} from './walletSession'

const ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'

beforeEach(() => {
  localStorage.clear()
})

describe('walletSession', () => {
  it('stores and reads a wallet address', () => {
    writeCachedWalletAddress(ADDRESS)
    expect(readCachedWalletAddress()).toBe(ADDRESS)
  })

  it('clears a stored wallet address', () => {
    writeCachedWalletAddress(ADDRESS)
    writeCachedWalletAddress(null)
    expect(readCachedWalletAddress()).toBeNull()
  })

  it('recognizes spaced Nimiq addresses', () => {
    expect(isLikelyNimiqAddress(ADDRESS)).toBe(true)
    expect(isLikelyNimiqAddress('not-an-address')).toBe(false)
  })
})
