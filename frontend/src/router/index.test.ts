import { describe, expect, it } from 'vitest'
import { routes } from './index'

describe('router startup loading', () => {
  it('keeps scan route lazy so OCR code is not loaded before first paint', () => {
    const scanRoute = routes.find((route) => route.name === 'scan')

    expect(scanRoute?.component).toEqual(expect.any(Function))
  })
})
