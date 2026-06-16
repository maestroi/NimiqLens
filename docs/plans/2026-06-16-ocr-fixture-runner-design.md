# OCR Fixture Runner Design

**Date:** 2026-06-16

**Problem**

Improving OCR currently depends too much on deploying to a phone, aiming the camera manually, and visually guessing what the pipeline did. That makes OCR iteration slow for both human developers and AI agents.

**Goal**

Add a local-file OCR fixture runner that executes the same price-detection pipeline against static images, emits structured results, and optionally writes debug artifacts so OCR changes can be inspected and compared without deploying the app.

**Primary Users**

- AI agents iterating on OCR heuristics and parser logic
- Developers debugging difficult price-label layouts
- Future CI regression checks against known OCR fixtures

**Recommended First Version**

Build a Node-based fixture runner under `frontend/` that:

1. Accepts one or more local image paths.
2. Loads each image file into a canvas-backed processing pipeline.
3. Runs the same crop selection, preprocessing variants, OCR scoring, and price parsing used by the app.
4. Prints both human-readable output and machine-readable JSON.
5. Optionally writes debug artifacts such as crops, variant images, and OCR text summaries.

This keeps iteration local and scriptable while avoiding premature UI work.

**Architecture**

The current scan logic is too tightly coupled to live `HTMLVideoElement` capture and browser-only canvases. The fixture runner should introduce a small shared OCR pipeline layer that accepts a static image source plus crop metadata and returns structured OCR candidate results. The mobile scan view and the runner should both consume that shared layer so future OCR changes stay aligned.

**Core Modules**

- `frontend/src/lib/ocrPipeline.ts`
  Shared logic for:
  - generating crop windows
  - preprocessing variants
  - running OCR on each variant
  - scoring candidates
  - selecting the winning parsed price

- `frontend/scripts/ocr-fixture-runner.ts`
  CLI entry point for local images.

- `frontend/fixtures/ocr/`
  Optional folder for saved example images used during development and later regression testing.

**Input / Output**

**Input**
- local file paths only for v1
- optional scan currency override
- optional output directory for artifacts
- optional JSON-only mode

**Output**

Structured JSON per file:

```json
{
  "input": "fixtures/ocr/zara-tag.jpg",
  "currency": "EUR",
  "crops": [
    {
      "index": 0,
      "rect": { "x": 92, "y": 204, "width": 552, "height": 257 },
      "variants": [
        {
          "index": 0,
          "mode": "grayscale",
          "text": "€ 3 99",
          "confidence": 41,
          "digitConfidence": 88,
          "parsed": { "amount": 3.99, "currency": "EUR" },
          "score": 88041
        }
      ]
    }
  ],
  "winner": {
    "cropIndex": 1,
    "variantIndex": 3,
    "parsed": { "amount": 3.99, "currency": "EUR" }
  }
}
```

Human-readable summary should also print:
- file path
- chosen currency
- winning parsed price
- best raw OCR text
- rejected/accepted variant counts

**Artifact Strategy**

Optional `--artifacts <dir>` writes:
- original crop images
- preprocessed variant images
- a JSON report file

This is important because OCR debugging often needs visual confirmation of what the runner actually fed into Tesseract.

**Implementation Notes**

- The runner will need a real canvas implementation in Node. The simplest practical path is to add a Node canvas dependency and load images from disk directly.
- The shared OCR pipeline must not depend on Vue or browser-only DOM APIs beyond the canvas/image layer.
- Price parsing should keep using `detectPrice()` unchanged as the final parser entry point.
- The runner should preserve the app’s current multi-crop behavior so static-image results match mobile behavior as closely as possible.

**Testing**

- Unit tests for the shared OCR pipeline candidate selection using mocked OCR results.
- A smoke test for the runner argument parsing and JSON output shape.
- Avoid hard-coding real OCR text in unit tests where the OCR engine itself is involved; keep the OCR engine mocked at the unit level.
- Real sample images can be used manually first, then promoted into a curated fixture set after the pipeline stabilizes.

**Out of Scope**

- Remote URL downloads in the runner
- A browser debug upload page
- CI golden-image enforcement
- Replacing `tesseract.js`

**Follow-on Work**

After the runner exists and proves useful:

1. Add a small dev-only upload/debug route using the same shared pipeline.
2. Add curated fixtures with expected outputs.
3. Add a regression command that compares current results to saved expectations.
