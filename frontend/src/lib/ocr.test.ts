import { describe, it, expect, vi } from 'vitest'

vi.mock('tesseract.js', () => ({
  default: {
    recognize: vi.fn(async () => ({ data: { text: '€12.99' } })),
  },
}))

import { recognizeText } from './ocr'

describe('recognizeText', () => {
  it('returns the text recognized from the image', async () => {
    const canvas = document.createElement('canvas')
    await expect(recognizeText(canvas)).resolves.toBe('€12.99')
  })
})
