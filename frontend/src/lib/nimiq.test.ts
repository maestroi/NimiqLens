import { beforeEach, describe, expect, it, vi } from 'vitest'
import { init } from '@nimiq/mini-app-sdk'
import { initNimiq } from './nimiq'

vi.mock('@nimiq/mini-app-sdk', () => ({
  init: vi.fn(),
}))

describe('initNimiq', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses a short provider detection timeout so app startup is not blocked', async () => {
    vi.mocked(init).mockRejectedValueOnce(new Error('provider unavailable'))

    await initNimiq()

    expect(init).toHaveBeenCalledWith({ timeout: 750 })
  })
})
