import { describe, it, expect } from 'vitest'
import { shortenAddress } from './address'
import { affordability } from './affordability'

describe('shortenAddress', () => {
  it('shortens a full NIM address to first and last group', () => {
    expect(shortenAddress('NQ07 0000 0000 0000 0000 0000 0000 0000 0000')).toBe('NQ07 **** **** 0000')
  })

  it('returns short input unchanged', () => {
    expect(shortenAddress('NQ07')).toBe('NQ07')
  })
})

describe('affordability', () => {
  it('returns null when balance is unknown', () => {
    expect(affordability(null, 10)).toBeNull()
  })

  it('reports affordable when balance covers the amount', () => {
    expect(affordability(100, 10)).toEqual({ affordable: true, deficit: 0 })
  })

  it('reports the deficit when balance is insufficient', () => {
    expect(affordability(5, 10)).toEqual({ affordable: false, deficit: 5 })
  })
})
