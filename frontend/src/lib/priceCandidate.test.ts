import { describe, it, expect } from 'vitest'
import { createPriceCandidateTracker } from './priceCandidate'
import type { DetectedPrice } from './priceDetection'

const eur1299: DetectedPrice = { amount: 12.99, currency: 'EUR' }
const eur1300: DetectedPrice = { amount: 13.0, currency: 'EUR' }

describe('createPriceCandidateTracker', () => {
  it('requires two consecutive matching prices before accepting', () => {
    const tracker = createPriceCandidateTracker()

    expect(tracker.observe(eur1299)).toBeNull()
    expect(tracker.observe(eur1299)).toEqual(eur1299)
  })

  it('resets when a later scan does not match', () => {
    const tracker = createPriceCandidateTracker()

    expect(tracker.observe(eur1299)).toBeNull()
    expect(tracker.observe(eur1300)).toBeNull()
    expect(tracker.observe(eur1300)).toEqual(eur1300)
  })

  it('clears pending state when no price is detected', () => {
    const tracker = createPriceCandidateTracker()

    expect(tracker.observe(eur1299)).toBeNull()
    expect(tracker.observe(null)).toBeNull()
    expect(tracker.observe(eur1299)).toBeNull()
    expect(tracker.observe(eur1299)).toEqual(eur1299)
  })

  it('can be reset explicitly', () => {
    const tracker = createPriceCandidateTracker()

    tracker.observe(eur1299)
    tracker.reset()
    expect(tracker.observe(eur1299)).toBeNull()
  })
})
