const MAX_TAP_MOVEMENT = 12

type VueEventInvoker = (event: Event) => void

function getVueClickInvoker(element: HTMLElement): VueEventInvoker | undefined {
  const invokerKey = Object.getOwnPropertySymbols(element)
    .find((symbol) => symbol.description === '_vei')
  if (!invokerKey) return undefined

  const invokers = (element as unknown as Record<symbol, Record<string, VueEventInvoker>>)[invokerKey]
  return invokers?.onClick
}

function findTappableElement(target: Element): HTMLElement | null {
  const button = target.closest('button')
  if (button instanceof HTMLButtonElement) {
    return button.disabled ? null : button
  }

  const anchor = target.closest('a[href]')
  if (anchor instanceof HTMLAnchorElement) {
    return anchor
  }

  return null
}

/**
 * Nimiq Pay's Android WebView often intercepts touch events before they reach
 * Vue's click handlers. Bridge touchend → synthetic click for buttons and
 * router-links (anchors).
 */
let installed = false

export function installNimiqPayTapBridge() {
  if (installed) return
  installed = true

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

    const element = findTappableElement(event.target)
    if (!element) return

    const invoker = getVueClickInvoker(element)
    if (!invoker) return

    event.preventDefault()
    invoker(new MouseEvent('click'))
  }, { capture: true, passive: false })
}
