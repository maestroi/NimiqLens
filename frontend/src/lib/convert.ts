export type Asset = 'NIM' | 'USDT' | 'BTC' | 'ETH'
export type FiatCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF'

export const ASSETS: Asset[] = ['NIM', 'USDT', 'BTC', 'ETH']
export const FIAT_CURRENCIES: FiatCurrency[] = ['EUR', 'USD', 'GBP', 'CHF']
export type FiatValues = Record<FiatCurrency, number>

/** assetAmount = fiatAmount / assetPriceInFiat */
export function computeAssetAmount(fiatAmount: number, rate: number): number {
  return fiatAmount / rate
}

export function convertNimBalanceToFiat(balanceNim: number, rates: FiatValues): FiatValues {
  return Object.fromEntries(
    FIAT_CURRENCIES.map((currency) => [currency, balanceNim * rates[currency]]),
  ) as FiatValues
}

/** Formats an asset amount with the decimal precision defined in the design spec. */
export function formatAssetAmount(asset: Asset, amount: number): string {
  let decimals: number
  switch (asset) {
    case 'NIM':
      decimals = amount < 1 ? 4 : 2
      break
    case 'USDT':
      decimals = 2
      break
    case 'BTC':
      decimals = 8
      break
    case 'ETH':
      decimals = 6
      break
    default: {
      const _exhaustive: never = asset
      throw new Error(`Unsupported asset: ${_exhaustive}`)
    }
  }
  return `≈ ${amount.toFixed(decimals)}`
}

/** Formats a fiat price for one unit of an asset (rates screen). */
export function formatFiatRate(asset: Asset, rate: number): string {
  if (asset === 'NIM') {
    return rate.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
  }
  if (asset === 'USDT') {
    return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  }
  return rate.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
