import { describe, it, expect, beforeEach } from 'vitest'
import {
  TARGET_HEIGHT_RATIO,
  TARGET_WIDTH_RATIO,
  PREPROCESS_SCALE,
  getTargetCropRect,
  preprocessPixels,
  preprocessTargetRegion,
} from './scanImage'

describe('getTargetCropRect', () => {
  it('returns a centered crop for the target box proportions', () => {
    const rect = getTargetCropRect(800, 600)

    expect(rect.width).toBe(Math.round(800 * TARGET_WIDTH_RATIO))
    expect(rect.height).toBe(Math.round(600 * TARGET_HEIGHT_RATIO))
    expect(rect.x).toBe(Math.round((800 - rect.width) / 2))
    expect(rect.y).toBe(Math.round((600 - rect.height) / 2))
  })
})

describe('preprocessTargetRegion', () => {
  let source: HTMLCanvasElement

  beforeEach(() => {
    source = document.createElement('canvas')
    source.width = 200
    source.height = 80
    const ctx = source.getContext('2d')
    ctx?.fillRect(0, 0, source.width, source.height)
  })

  it('returns 2x scaled processed variants', () => {
    const variants = preprocessTargetRegion(source)

    expect(variants.length).toBeGreaterThan(0)
    for (const variant of variants) {
      expect(variant.width).toBe(source.width * PREPROCESS_SCALE)
      expect(variant.height).toBe(source.height * PREPROCESS_SCALE)
    }
  })
})

describe('preprocessPixels', () => {
  it('converts color pixels to grayscale', () => {
    const pixels = new Uint8ClampedArray([255, 0, 0, 255])

    expect([...preprocessPixels(pixels, 'grayscale')]).toEqual([76, 76, 76, 255])
  })

  it('converts grayscale pixels to a threshold variant', () => {
    const pixels = new Uint8ClampedArray([
      100, 100, 100, 255,
      200, 200, 200, 255,
    ])

    expect([...preprocessPixels(pixels, 'threshold', 128)]).toEqual([
      0, 0, 0, 255,
      255, 255, 255, 255,
    ])
  })
})
