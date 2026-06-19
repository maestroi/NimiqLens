import { init } from '@nimiq/mini-app-sdk'

export type NimiqProvider = Awaited<ReturnType<typeof init>>

interface ProviderErrorResponse {
  error: {
    type: string
    message: string
  }
}

let provider: NimiqProvider | null = null
let standalone = false

export function isStandalone(): boolean {
  return standalone
}

export function providerResult<T>(result: T | ProviderErrorResponse): T {
  if (typeof result === 'object' && result !== null && 'error' in result) {
    throw new Error(result.error.message)
  }
  return result
}

/**
 * Initializes the Nimiq Pay provider. Returns null (instead of throwing) when
 * the app is not running inside Nimiq Pay or initialization times out, so the
 * app can fall back to a non-wallet experience.
 */
export async function initNimiq(timeout = 750): Promise<NimiqProvider | null> {
  if (provider) return provider
  try {
    provider = await init({ timeout })
    standalone = false
    return provider
  } catch {
    standalone = true
    provider = null
    return null
  }
}
