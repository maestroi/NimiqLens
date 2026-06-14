const MAX_TAP_MOVEMENT = 12

type VueEventInvoker = (event: Event) => void

function getVueClickInvoker(button: HTMLButtonElement): VueEventInvoker | undefined {
  const invokerKey = Object.getOwnPropertySymbols(button)
    .find((symbol) => symbol.description === '_vei')
  if (!invokerKey) return undefined

  const invokers = (button as unknown as Record<symbol, Record<string, VueEventInvoker>>)[invokerKey]
  return invokers?.onClick
}

/**
 * Nimiq Pay's Android WebView often intercepts touch events before they reach
 * Vue's click handlers. Bridge touchend → synthetic click for button taps.
 */
export function installNimiqPayTapBridge() {
  const isAndroidWebView = navigator.userAgent.includes('; wv)')
  const inNimiqPay = 'nimiqPay' in window && (window as Window & { nimiqPay?: unknown }).nimiqPay
  if (!inNimiqPay && !isAndroidWebView) return

  let startX = 0
  let startY = 0

  window.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0]
    if (!touch) return
    startX = touch.clientX
    startY = touch.clientY
  }, { capture: true, passive: true })

  window.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0]
    if (!touch || !(event.target instanceof Element)) return
    if (
      Math.abs(touch.clientX - startX) > MAX_TAP_MOVEMENT
      || Math.abs(touch.clientY - startY) > MAX_TAP_MOVEMENT
    ) return

    const button = event.target.closest('button')
    if (!button || button.disabled) return

    event.preventDefault()
    const invoker = getVueClickInvoker(button)
    invoker?.(new MouseEvent('click'))
  }, { capture: true, passive: false })
}
