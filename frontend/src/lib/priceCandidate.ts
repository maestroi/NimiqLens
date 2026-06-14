import type { DetectedPrice } from './priceDetection'

function pricesMatch(a: DetectedPrice, b: DetectedPrice): boolean {
  return a.amount === b.amount && a.currency === b.currency
}

export interface PriceCandidateTracker {
  observe(detected: DetectedPrice | null): DetectedPrice | null
  reset(): void
}

export function createPriceCandidateTracker(): PriceCandidateTracker {
  let pending: DetectedPrice | null = null

  return {
    observe(detected) {
      if (!detected) {
        pending = null
        return null
      }

      if (pending && pricesMatch(pending, detected)) {
        pending = null
        return detected
      }

      pending = detected
      return null
    },
    reset() {
      pending = null
    },
  }
}
