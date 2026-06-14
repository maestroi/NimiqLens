/**
 * Recognizes text in an image using Tesseract.js. The library (and its WASM
 * payload) is dynamically imported here so it is only downloaded when a scan
 * is actually performed, keeping it out of the main bundle.
 */
export async function recognizeText(image: HTMLCanvasElement): Promise<string> {
  const { default: Tesseract } = await import('tesseract.js')
  const result = await Tesseract.recognize(image, 'eng')
  return result.data.text
}
