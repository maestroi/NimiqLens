import type { Worker } from 'tesseract.js'

/** Characters commonly found in price labels for OCR whitelisting. */
export const PRICE_CHAR_WHITELIST = '0123456789.,€$£FrCH USDGBP'

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
export async function recognizeText(image: HTMLCanvasElement): Promise<string> {
  const worker = await getWorker()
  const result = await worker.recognize(image)
  return result.data.text
}

/** Releases the shared OCR worker. Safe to call when no worker is active. */
export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return
  const worker = await workerPromise
  workerPromise = null
  await worker.terminate()
}
