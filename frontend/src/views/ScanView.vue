<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useScanStore } from '../stores/scan'
import { detectPrice } from '../lib/priceDetection'
import { recognizeText } from '../lib/ocr'
import { FIAT_CURRENCIES, type FiatCurrency } from '../lib/convert'

const router = useRouter()
const scanStore = useScanStore()

const cameraSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
const insecureContext = typeof globalThis !== 'undefined' && globalThis.isSecureContext === false

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const stream = ref<MediaStream | null>(null)
const cameraError = ref<string | null>(null)
const scanning = ref(false)
const ocrReady = ref(false)
const noPriceFound = ref(false)
const detected = ref(false)
const editAmount = ref<number | null>(null)
const editCurrency = ref<FiatCurrency>('EUR')

async function startCamera() {
  cameraError.value = null
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    if (videoRef.value) {
      videoRef.value.srcObject = stream.value
      await videoRef.value.play()
    }
  } catch (e) {
    cameraError.value = e instanceof Error ? e.message : String(e)
  }
}

function stopCamera() {
  stream.value?.getTracks().forEach((track) => track.stop())
  stream.value = null
}

async function scan() {
  if (!videoRef.value || !canvasRef.value) return

  scanning.value = true
  noPriceFound.value = false
  try {
    const video = videoRef.value
    const canvas = canvasRef.value
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const text = await recognizeText(canvas)
    const price = detectPrice(text, editCurrency.value)
    if (price) {
      detected.value = true
      editAmount.value = price.amount
      editCurrency.value = price.currency
    } else {
      noPriceFound.value = true
    }
  } finally {
    scanning.value = false
  }
}

function retry() {
  detected.value = false
  noPriceFound.value = false
}

function confirm() {
  if (editAmount.value === null) return
  scanStore.setPending(editAmount.value, editCurrency.value)
  stopCamera()
  router.push('/convert')
}

onMounted(() => {
  void import('tesseract.js').then(() => {
    ocrReady.value = true
  })
})

onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <div class="min-h-screen p-4 pb-24 flex flex-col gap-4">
    <h1 class="text-2xl font-bold">Camera Scan</h1>
    <p class="text-sm text-slate-400">
      Frames are processed entirely on your device — nothing is uploaded or stored.
    </p>

    <label class="flex items-center justify-between gap-3 rounded-lg bg-slate-800 p-3">
      <span class="text-sm text-slate-300">Scan currency</span>
      <select v-model="editCurrency" class="min-h-[44px] rounded-lg bg-slate-900 px-3 text-lg">
        <option v-for="c in FIAT_CURRENCIES" :key="c" :value="c">{{ c }}</option>
      </select>
    </label>

    <div v-if="!cameraSupported" class="rounded-lg bg-slate-800 p-4 text-slate-300">
      <template v-if="insecureContext">
        Camera access requires HTTPS on mobile. Reopen NimLens from a secure HTTPS URL.
      </template>
      <template v-else>
        Camera access isn't available on this device or browser.
      </template>
    </div>

    <template v-else>
      <div
        v-if="cameraError"
        class="rounded-lg bg-red-900/40 border border-red-600 px-3 py-2 text-sm text-red-200"
      >
        Camera access failed: {{ cameraError }}
      </div>

      <video ref="videoRef" class="w-full rounded-lg bg-black aspect-video" muted playsinline></video>
      <canvas ref="canvasRef" class="hidden"></canvas>

      <button
        v-if="!stream"
        type="button"
        class="min-h-[44px] rounded-lg bg-emerald-600 px-4 font-medium"
        @click="startCamera"
      >
        Start camera
      </button>
      <p v-if="stream && !ocrReady" class="text-sm text-slate-400">
        Preparing scanner…
      </p>

      <button
        v-else-if="stream"
        type="button"
        :disabled="scanning"
        class="min-h-[44px] rounded-lg bg-emerald-600 px-4 font-medium disabled:opacity-50"
        @click="scan"
      >
        {{ scanning ? 'Scanning…' : 'Scan' }}
      </button>

      <div
        v-if="noPriceFound"
        class="rounded-lg bg-amber-900/40 border border-amber-600 px-3 py-2 text-sm text-amber-200"
      >
        No price found — try again, or enter the price manually below.
      </div>

      <div v-if="detected" class="rounded-xl bg-slate-800 p-4 flex flex-col gap-3">
        <div class="text-slate-300">Detected: {{ editAmount }} {{ editCurrency }} — is this correct?</div>
        <div class="flex gap-2">
          <input
            v-model.number="editAmount"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            class="flex-1 min-h-[44px] rounded-lg bg-slate-900 px-3 text-xl"
          />
          <select v-model="editCurrency" class="min-h-[44px] rounded-lg bg-slate-900 px-3 text-xl">
            <option v-for="c in FIAT_CURRENCIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <button type="button" class="min-h-[44px] rounded-lg bg-emerald-600 px-4 font-medium" @click="confirm">
          Confirm
        </button>
        <button type="button" class="min-h-[44px] rounded-lg bg-slate-700 px-4 font-medium" @click="retry">
          Try again
        </button>
      </div>
    </template>

    <router-link
      to="/convert"
      class="min-h-[44px] rounded-lg bg-slate-800 px-4 py-3 font-medium text-center flex items-center justify-center"
    >
      Enter price manually
    </router-link>
  </div>
</template>
