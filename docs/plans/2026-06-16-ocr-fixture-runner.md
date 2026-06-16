# OCR Fixture Runner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local-file OCR fixture runner so developers and AI agents can run the existing price-detection pipeline on static images without deploying to a phone.

**Architecture:** Extract the OCR-candidate generation and scoring logic into a shared pipeline module that accepts static image/crop inputs. Add a Node script that loads local image files, runs the shared pipeline, prints structured JSON, and optionally saves crop/variant artifacts for inspection.

**Tech Stack:** TypeScript, Node.js, Tesseract.js, Vue app shared libs, Vitest, Node canvas/image support

---

### Task 1: Add the failing shared-pipeline tests

**Files:**
- Create: `frontend/src/lib/ocrPipeline.test.ts`
- Modify: `frontend/package.json`

**Step 1: Write the failing tests**

Add tests for a shared OCR pipeline module that prove:
- it scores OCR candidates across crops and variants
- it returns the strongest parsed winner
- it reports rejected variants with confidence and parse metadata

**Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- src/lib/ocrPipeline.test.ts`
Expected: FAIL because `ocrPipeline.ts` does not exist yet

**Step 3: Commit the failing tests**

```bash
git add frontend/src/lib/ocrPipeline.test.ts frontend/package.json
git commit -m "test: define OCR fixture pipeline behavior"
```

### Task 2: Extract the shared OCR pipeline module

**Files:**
- Create: `frontend/src/lib/ocrPipeline.ts`
- Modify: `frontend/src/views/ScanView.vue`
- Test: `frontend/src/lib/ocrPipeline.test.ts`

**Step 1: Write the minimal implementation**

Create a shared module that:
- accepts crop variant canvases and scan currency
- runs `recognizeText()`
- applies `maxDigitWordConfidence()`
- applies `detectPrice()`
- scores accepted candidates
- returns structured crop/variant results plus the winning parsed candidate

**Step 2: Update `ScanView.vue` to use the shared pipeline**

Replace the current in-view candidate loop with the shared helper so the app and runner stay aligned.

**Step 3: Run the targeted tests to verify they pass**

Run: `npm test -- src/lib/ocrPipeline.test.ts src/views/ScanView.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add frontend/src/lib/ocrPipeline.ts frontend/src/lib/ocrPipeline.test.ts frontend/src/views/ScanView.vue
git commit -m "refactor: share OCR candidate pipeline"
```

### Task 3: Add static-image crop support for the runner

**Files:**
- Modify: `frontend/src/lib/scanImage.ts`
- Modify: `frontend/src/lib/scanImage.test.ts`

**Step 1: Write the failing tests**

Add tests for helpers that can:
- compute crop rects for a static image size
- extract crops from a static canvas/image
- generate preprocessing variants without relying on a live video element

**Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- src/lib/scanImage.test.ts`
Expected: FAIL because the static-image helper exports do not exist yet

**Step 3: Write the minimal implementation**

Add small shared helpers that the live scanner and the runner can both use, without changing current scan behavior.

**Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- src/lib/scanImage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/lib/scanImage.ts frontend/src/lib/scanImage.test.ts
git commit -m "refactor: share static OCR crop helpers"
```

### Task 4: Add the local-file fixture runner script

**Files:**
- Create: `frontend/scripts/ocr-fixture-runner.ts`
- Modify: `frontend/package.json`
- Create: `frontend/fixtures/ocr/.gitkeep`

**Step 1: Write the failing runner smoke test or validation harness**

Prefer a small unit-level test for argument parsing or output shaping if practical. If not, create a simple manual harness command documented in the plan and treat the command run as the red/green proof point.

**Step 2: Run the new command and verify it fails**

Run: `npm run ocr:fixture -- ./fixtures/ocr/example.jpg`
Expected: FAIL because the script or command does not exist yet

**Step 3: Write the minimal implementation**

Implement a CLI script that:
- accepts one or more local image paths
- optionally accepts `--currency` and `--artifacts`
- loads each image into a Node canvas
- runs the shared OCR pipeline
- prints readable output and JSON

**Step 4: Run the command to verify it works**

Run: `npm run ocr:fixture -- ./fixtures/ocr/example.jpg`
Expected: structured output or a clear file-not-found error from the real script

**Step 5: Commit**

```bash
git add frontend/scripts/ocr-fixture-runner.ts frontend/package.json frontend/fixtures/ocr/.gitkeep
git commit -m "feat: add OCR fixture runner"
```

### Task 5: Add optional artifact output

**Files:**
- Modify: `frontend/scripts/ocr-fixture-runner.ts`
- Modify: `frontend/package.json`

**Step 1: Write the failing artifact test or manual proof case**

Cover:
- artifact directory creation
- crop image output
- variant image output
- JSON report file output

**Step 2: Run the proof command to verify it fails**

Run: `npm run ocr:fixture -- ./fixtures/ocr/example.jpg --artifacts ./tmp/ocr-artifacts`
Expected: FAIL because artifact writing is not implemented yet

**Step 3: Write the minimal implementation**

Add artifact writing without changing the core OCR result format.

**Step 4: Run the command to verify it passes**

Run: `npm run ocr:fixture -- ./fixtures/ocr/example.jpg --artifacts ./tmp/ocr-artifacts`
Expected: artifact files present plus successful runner output

**Step 5: Commit**

```bash
git add frontend/scripts/ocr-fixture-runner.ts frontend/package.json
git commit -m "feat: export OCR debug artifacts"
```

### Task 6: Full verification

**Files:**
- Modify: none expected

**Step 1: Run the full frontend unit suite**

Run: `npm test`
Expected: PASS

**Step 2: Run the frontend production build**

Run: `npm run build`
Expected: PASS

**Step 3: Run the fixture runner against at least one real local image**

Run: `npm run ocr:fixture -- /tmp/nimlens-pinterest/zara-tag.jpg --currency EUR`
Expected: successful JSON/report output from the real script

**Step 4: Run whitespace validation**

Run: `git diff --check`
Expected: no output

**Step 5: Commit final cleanup if needed**

```bash
git add -A
git commit -m "chore: finalize OCR fixture tooling"
```
