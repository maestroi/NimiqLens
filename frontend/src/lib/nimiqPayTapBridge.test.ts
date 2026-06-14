import { describe, expect, it, vi } from 'vitest'
import { installNimiqPayTapBridge } from './nimiqPayTapBridge'

function touchEvent(type: string, x: number, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'changedTouches', {
    value: [{ clientX: x, clientY: y }],
  })
  return event
}

describe('Nimiq Pay tap bridge', () => {
  it('delivers a synthetic click when the host intercepts normal taps', () => {
    Object.defineProperty(window, 'nimiqPay', { value: { requestDeviceIdentifier: vi.fn() }, configurable: true })
    installNimiqPayTapBridge()

    const button = document.createElement('button')
    const icon = document.createElement('span')
    const onTap = vi.fn()
    const invokerKey = Symbol('_vei')
    Object.assign(button, { [invokerKey]: { onClick: onTap } })
    button.append(icon)
    document.body.append(button)

    icon.dispatchEvent(touchEvent('touchstart', 20, 30))
    icon.dispatchEvent(touchEvent('touchend', 20, 30))

    expect(onTap).toHaveBeenCalledOnce()
  })

  it('delivers a synthetic click for router-link taps', () => {
    Object.defineProperty(window, 'nimiqPay', { value: { requestDeviceIdentifier: vi.fn() }, configurable: true })
    installNimiqPayTapBridge()

    const link = document.createElement('a')
    link.href = '/convert'
    const label = document.createElement('span')
    const onTap = vi.fn()
    const invokerKey = Symbol('_vei')
    Object.assign(link, { [invokerKey]: { onClick: onTap } })
    link.append(label)
    document.body.append(link)

    label.dispatchEvent(touchEvent('touchstart', 10, 20))
    label.dispatchEvent(touchEvent('touchend', 10, 20))

    expect(onTap).toHaveBeenCalledOnce()
  })
})
