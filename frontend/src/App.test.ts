import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'
import { useWalletStore } from './stores/wallet'

const replace = vi.fn()
let routeName = 'welcome'

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: routeName }),
  useRouter: () => ({ replace }),
}))

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    replace.mockReset()
    routeName = 'welcome'
    localStorage.clear()
  })

  it('does not wait for wallet provider detection before onboarding routing', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const walletStore = useWalletStore()
    walletStore.init = vi.fn().mockReturnValue(new Promise(() => {}))

    mount(App, {
      global: {
        plugins: [pinia],
        stubs: {
          RouterView: { template: '<main />' },
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await Promise.resolve()

    expect(replace).toHaveBeenCalledWith('/onboarding')
  })
})
