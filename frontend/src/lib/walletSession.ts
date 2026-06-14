const WALLET_KEY = 'nimlens_wallet'

export function readCachedWalletAddress(): string | null {
  try {
    return localStorage.getItem(WALLET_KEY)
  } catch {
    return null
  }
}

export function writeCachedWalletAddress(address: string | null): void {
  try {
    if (address) localStorage.setItem(WALLET_KEY, address)
    else localStorage.removeItem(WALLET_KEY)
  } catch {
    // Storage may be unavailable in some WebViews.
  }
}

/** Basic shape check for a spaced Nimiq address (NQ + 9 groups). */
export function isLikelyNimiqAddress(address: string): boolean {
  return /^NQ[0-9A-Z]{2}(\s+[0-9A-Z]{4}){8}$/i.test(address.trim())
}
