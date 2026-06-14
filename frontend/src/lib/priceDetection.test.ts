import { describe, it, expect } from 'vitest'
import { detectPrice } from './priceDetection'

describe('detectPrice', () => {
  it('detects a symbol-prefixed euro price', () => {
    expect(detectPrice('€12.99')).toEqual({ amount: 12.99, currency: 'EUR' })
  })

  it('detects a European-formatted price with a EUR code suffix', () => {
    expect(detectPrice('12,99 EUR')).toEqual({ amount: 12.99, currency: 'EUR' })
  })

  it('detects a symbol-prefixed dollar price', () => {
    expect(detectPrice('$24.50')).toEqual({ amount: 24.5, currency: 'USD' })
  })

  it('detects a price with a USD code suffix', () => {
    expect(detectPrice('24.50 USD')).toEqual({ amount: 24.5, currency: 'USD' })
  })

  it('detects a symbol-prefixed pound price', () => {
    expect(detectPrice('£9.99')).toEqual({ amount: 9.99, currency: 'GBP' })
  })

  it('detects a CHF-prefixed price', () => {
    expect(detectPrice('CHF 12.99')).toEqual({ amount: 12.99, currency: 'CHF' })
  })

  it('detects a Fr.-prefixed price', () => {
    expect(detectPrice('Fr. 9.50')).toEqual({ amount: 9.5, currency: 'CHF' })
  })

  it('detects a price with thousands separators', () => {
    expect(detectPrice('€1.234,56')).toEqual({ amount: 1234.56, currency: 'EUR' })
  })

  it('finds a price within surrounding receipt text', () => {
    expect(detectPrice('Total\n€12.99\nThank you')).toEqual({ amount: 12.99, currency: 'EUR' })
  })

  it('returns null when no price-like pattern is found', () => {
    expect(detectPrice('Open 9am - 5pm')).toBeNull()
  })
})
