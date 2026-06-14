import { describe, it, expect, vi, beforeEach } from 'vitest'

const createWorker = vi.fn(async () => ({
  setParameters: vi.fn(async () => ({})),
  recognize: vi.fn(async () => ({ data: { text: '€12.99' } })),
  terminate: vi.fn(async () => ({})),
}))

vi.mock('tesseract.js', () => ({
  createWorker,
}))

import { prepareOcrWorker, recognizeText, terminateOcrWorker, PRICE_CHAR_WHITELIST } from './ocr'

describe('ocr worker', () => {
  beforeEach(async () => {
    await terminateOcrWorker()
    createWorker.mockClear()
  })

  it('reuses a lazily created worker across scans', async () => {
    const canvas = document.createElement('canvas')

    await recognizeText(canvas)
    await recognizeText(canvas)

    expect(createWorker).toHaveBeenCalledTimes(1)
  })

  it('configures price-related characters on the worker', async () => {
    const canvas = document.createElement('canvas')
    await recognizeText(canvas)

    const worker = await createWorker.mock.results[0].value
    expect(worker.setParameters).toHaveBeenCalledWith({
      tessedit_char_whitelist: PRICE_CHAR_WHITELIST,
    })
  })

  it('terminates the worker when requested', async () => {
    const canvas = document.createElement('canvas')
    await recognizeText(canvas)

    const worker = await createWorker.mock.results[0].value
    await terminateOcrWorker()

    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('prepareOcrWorker creates the worker ahead of time', async () => {
    await prepareOcrWorker()
    expect(createWorker).toHaveBeenCalledTimes(1)
  })

  it('retries worker creation after initialization fails', async () => {
    createWorker
      .mockRejectedValueOnce(new Error('worker failed'))
      .mockResolvedValueOnce({
        setParameters: vi.fn(async () => ({})),
        recognize: vi.fn(async () => ({ data: { text: '€12.99' } })),
        terminate: vi.fn(async () => ({})),
      })

    await expect(prepareOcrWorker()).rejects.toThrow('worker failed')
    await expect(prepareOcrWorker()).resolves.toBeUndefined()

    expect(createWorker).toHaveBeenCalledTimes(2)
  })
})
