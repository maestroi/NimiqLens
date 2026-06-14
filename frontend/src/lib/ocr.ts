import type Tesseract from 'tesseract.js'

type Worker = Tesseract.Worker
type Page = Tesseract.Page

/**
 * Characters commonly found in price labels for OCR whitelisting. Includes digits,
 * decimal/thousands separators, the "X,-" / "X.-" whole-amount dash notation, the
 * supported currency symbols, and every letter needed to spell out a supported
 * currency code (EUR, USD, GBP, CHF, JPY, CNY, AUD, CAD, INR, BRL) or "Fr.".
 */
export const PRICE_CHAR_WHITELIST = '0123456789.,-€$£¥₹ABCDEFGHIJLNPRSUYr '

/** Minimum confidence (0-100) for the digits making up a price to be trusted. */
export const MIN_OCR_CONFIDENCE = 60

export interface OcrWord {
  text: string
  confidence: number
}

export interface OcrResult {
  text: string
  confidence: number
  /** Individually recognized words with their own confidence scores. */
  words: OcrWord[]
}

/**
 * Returns the highest confidence among recognized words that contain at least one
 * digit. Price labels are often surrounded by unrelated text (product names,
 * discount badges, dates) that drags down the overall page confidence even when the
 * price itself was read cleanly — so the digits' own confidence is a better signal.
 */
export function maxDigitWordConfidence(words: OcrWord[]): number {
  let max = 0
  for (const word of words) {
    if (/\d/.test(word.text)) {
      max = Math.max(max, word.confidence)
    }
  }
  return max
}

function flattenWords(page: Page): OcrWord[] {
  const words: OcrWord[] = []
  for (const block of page.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          words.push({ text: word.text, confidence: word.confidence })
        }
      }
    }
  }
  return words
}

let workerPromise: Promise<Worker> | null = null

async function loadWorker(): Promise<Worker> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  await worker.setParameters({
    tessedit_char_whitelist: PRICE_CHAR_WHITELIST,
  })
  return worker
}

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = loadWorker().catch((error) => {
      workerPromise = null
      throw error
    })
  }
  return workerPromise
}

/** Ensures the shared OCR worker exists before the first scan. */
export async function prepareOcrWorker(): Promise<void> {
  await getWorker()
}

/**
 * Recognizes text in an image using a reusable Tesseract.js worker. The library
 * (and its WASM payload) is dynamically imported so it is only downloaded when
 * scanning starts.
 */
export async function recognizeText(image: HTMLCanvasElement): Promise<OcrResult> {
  const worker = await getWorker()
  const result = await worker.recognize(image, {}, { blocks: true })
  return {
    text: result.data.text,
    confidence: result.data.confidence,
    words: flattenWords(result.data),
  }
}

/** Releases the shared OCR worker. Safe to call when no worker is active. */
export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return
  const worker = await workerPromise
  workerPromise = null
  await worker.terminate()
}
