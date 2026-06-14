import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AboutView from './AboutView.vue'
import { useWalletStore } from '../stores/wallet'

const ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('AboutView', () => {
  it('hides the tip button when not connected to Nimiq Pay', () => {
    const wrapper = mount(AboutView)
    expect(wrapper.text()).not.toContain('Tip')
  })

  it('shows the tip button once a wallet is connected', () => {
    const walletStore = useWalletStore()
    walletStore.$patch({ isInsideNimiqPay: true, address: ADDRESS })

    const wrapper = mount(AboutView)
    expect(wrapper.text()).toContain('Tip')
  })

  it('sends a tip when the button is pressed', async () => {
    const walletStore = useWalletStore()
    walletStore.$patch({ isInsideNimiqPay: true, address: ADDRESS })
    walletStore.sendTip = vi.fn()

    const wrapper = mount(AboutView)
    await wrapper.find('button').trigger('click')

    expect(walletStore.sendTip).toHaveBeenCalled()
  })
})
