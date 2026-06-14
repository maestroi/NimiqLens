import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useScanStore } from './scan'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useScanStore', () => {
  it('starts with no pending price', () => {
    const store = useScanStore()
    expect(store.pendingPrice).toBeNull()
    expect(store.pendingCurrency).toBeNull()
  })

  it('stores a pending price and currency', () => {
    const store = useScanStore()
    store.setPending(12.99, 'EUR')
    expect(store.pendingPrice).toBe(12.99)
    expect(store.pendingCurrency).toBe('EUR')
  })

  it('clears the pending price and currency', () => {
    const store = useScanStore()
    store.setPending(12.99, 'EUR')
    store.clearPending()
    expect(store.pendingPrice).toBeNull()
    expect(store.pendingCurrency).toBeNull()
  })
})
