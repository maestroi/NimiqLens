import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ScanView from './ScanView.vue'

const stubs = { RouterLink: { template: '<a><slot /></a>' } }

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ScanView', () => {
  it('shows the on-device privacy note', () => {
    const wrapper = mount(ScanView, { global: { stubs } })
    expect(wrapper.text()).toContain('processed entirely on your device')
  })

  it('shows a fallback message when the camera is unavailable', () => {
    // jsdom has no navigator.mediaDevices, so the camera-unavailable
    // fallback is always the path exercised in unit tests.
    const wrapper = mount(ScanView, { global: { stubs } })
    expect(wrapper.text()).toContain("Camera access isn't available")
  })

  it('explains that an insecure mobile origin blocks camera access', () => {
    vi.stubGlobal('isSecureContext', false)

    const wrapper = mount(ScanView, { global: { stubs } })

    expect(wrapper.text()).toContain('Camera access requires HTTPS on mobile')
  })

  it('always offers manual price entry', () => {
    const wrapper = mount(ScanView, { global: { stubs } })
    expect(wrapper.text()).toContain('Enter price manually')
  })
})
