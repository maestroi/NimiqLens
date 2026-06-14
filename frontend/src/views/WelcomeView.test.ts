import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { mount } from '@vue/test-utils'
import WelcomeView from './WelcomeView.vue'
import { useWalletStore } from '../stores/wallet'
import { useRatesStore } from '../stores/rates'
import type { RatesResponse } from '../lib/api'

const ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'
const RATES: RatesResponse = {
  rates: {
    NIM: { EUR: 0.01, USD: 0.011, GBP: 0.009, CHF: 0.0095 },
    USDT: { EUR: 0.92, USD: 1, GBP: 0.79, CHF: 0.88 },
    BTC: { EUR: 55000, USD: 64000, GBP: 48000, CHF: 51000 },
    ETH: { EUR: 1400, USD: 1600, GBP: 1200, CHF: 1300 },
  },
  timestamp: '2026-06-14T00:00:00Z',
  fetched_at: '2026-06-14T00:00:00Z',
  stale: false,
  source: 'CoinGecko',
}

let pinia: Pinia

function mountView() {
  return mount(WelcomeView, {
    global: {
      plugins: [pinia],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})

describe('WelcomeView', () => {
  it('offers to show the wallet balance after the provider initializes', () => {
    const walletStore = useWalletStore()
    walletStore.$patch({ isInsideNimiqPay: true, initialized: true })
    walletStore.connect = vi.fn()

    const wrapper = mountView()

    expect(wrapper.text()).toContain('Show wallet balance')
  })

  it('shows that the wallet is connecting on startup', () => {
    const walletStore = useWalletStore()
    walletStore.$patch({ isInsideNimiqPay: true, connecting: true, initialized: true })

    const wrapper = mountView()

    expect(wrapper.text()).toContain('Connecting to your wallet')
  })

  it('shows provider startup before wallet access is requested', () => {
    const walletStore = useWalletStore()
    walletStore.$patch({ isInsideNimiqPay: true, initialized: false })

    const wrapper = mountView()

    expect(wrapper.text()).toContain('Starting Nimiq Pay')
  })

  it('shows the NIM balance converted to every supported fiat currency', () => {
    const walletStore = useWalletStore()
    walletStore.$patch({ initialized: true, address: ADDRESS, balanceNim: 100 })
    const ratesStore = useRatesStore()
    ratesStore.$patch({ rates: RATES })

    const wrapper = mountView()

    expect(wrapper.text()).toContain('100.00 NIM')
    expect(wrapper.text()).toContain('EUR 1.00')
    expect(wrapper.text()).toContain('USD 1.10')
    expect(wrapper.text()).toContain('GBP 0.90')
    expect(wrapper.text()).toContain('CHF 0.95')
  })

  it('retries wallet connection after an account-access failure', async () => {
    const walletStore = useWalletStore()
    walletStore.$patch({
      isInsideNimiqPay: true,
      initialized: true,
      connectionError: 'User rejected',
    })
    walletStore.connect = vi.fn()

    const wrapper = mountView()
    await wrapper.get('button').trigger('click')

    expect(wrapper.text()).toContain('User rejected')
    expect(walletStore.connect).toHaveBeenCalledOnce()
  })
})
