<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useScanStore } from '../stores/scan'
import { detectPrice } from '../lib/priceDetection'
import { recognizeText } from '../lib/ocr'
import { FIAT_CURRENCIES, type FiatCurrency } from '../lib/convert'
import IconCamera from '../components/icons/IconCamera.vue'
import IconExchange from '../components/icons/IconExchange.vue'
import IconAlert from '../components/icons/IconAlert.vue'
import IconCheck from '../components/icons/IconCheck.vue'

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
  <div class="min-h-screen p-4 pb-28 flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <IconCamera class="h-6 w-6 text-nimiq-blue-light" />
      <h1 class="text-2xl font-bold">Camera Scan</h1>
    </div>
    <p class="text-sm text-nimiq-muted">
      Frames are processed entirely on your device — nothing is uploaded or stored.
    </p>

    <label class="flex items-center justify-between gap-3 rounded-lg bg-nimiq-card border border-nimiq-border p-3">
      <span class="text-sm text-nimiq-muted">Scan currency</span>
      <select
        v-model="editCurrency"
        class="min-h-[44px] rounded-lg bg-nimiq-card-elevated px-3 text-lg cursor-pointer focus:outline-2 focus:outline-nimiq-blue-light"
      >
        <option v-for="c in FIAT_CURRENCIES" :key="c" :value="c">{{ c }}</option>
      </select>
    </label>

    <div v-if="!cameraSupported" class="rounded-lg bg-nimiq-card border border-nimiq-border p-4 text-nimiq-muted">
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
        class="flex items-center gap-2 rounded-lg border border-nimiq-red/30 bg-nimiq-red/10 px-3 py-2 text-sm text-nimiq-red-light"
      >
        <IconAlert class="h-4 w-4 shrink-0" />
        Camera access failed: {{ cameraError }}
      </div>

      <video ref="videoRef" class="w-full rounded-xl bg-black aspect-video" muted playsinline></video>
      <canvas ref="canvasRef" class="hidden"></canvas>

      <button
        v-if="!stream"
        type="button"
        class="min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-nimiq-blue-light px-4 font-medium text-nimiq-darkerblue transition-colors duration-200 hover:brightness-110 cursor-pointer"
        @click="startCamera"
      >
        <IconCamera class="h-5 w-5" />
        Start camera
      </button>
      <p v-if="stream && !ocrReady" class="text-sm text-nimiq-muted">
        Preparing scanner…
      </p>

      <button
        v-else-if="stream"
        type="button"
        :disabled="scanning"
        class="min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-nimiq-blue-light px-4 font-medium text-nimiq-darkerblue transition-colors duration-200 hover:brightness-110 disabled:opacity-50 cursor-pointer"
        @click="scan"
      >
        {{ scanning ? 'Scanning…' : 'Scan' }}
      </button>

      <div
        v-if="noPriceFound"
        class="flex items-center gap-2 rounded-lg border border-nimiq-gold/30 bg-nimiq-gold/10 px-3 py-2 text-sm text-nimiq-gold-light"
      >
        <IconAlert class="h-4 w-4 shrink-0" />
        No price found — try again, or enter the price manually below.
      </div>

      <div v-if="detected" class="rounded-xl border border-nimiq-border bg-nimiq-card p-4 flex flex-col gap-3">
        <div class="flex items-center gap-2 text-nimiq-muted">
          <IconCheck class="h-4 w-4 shrink-0 text-nimiq-green-light" />
          Detected: {{ editAmount }} {{ editCurrency }} — is this correct?
        </div>
        <div class="flex gap-2">
          <input
            v-model.number="editAmount"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            class="min-w-0 flex-1 min-h-[44px] rounded-lg bg-nimiq-card-elevated px-3 text-xl focus:outline-2 focus:outline-nimiq-blue-light"
          />
          <select
            v-model="editCurrency"
            class="w-24 shrink-0 min-h-[44px] rounded-lg bg-nimiq-card-elevated px-3 text-xl cursor-pointer focus:outline-2 focus:outline-nimiq-blue-light"
          >
            <option v-for="c in FIAT_CURRENCIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <button
          type="button"
          class="min-h-[44px] rounded-lg bg-nimiq-green-light px-4 font-medium text-nimiq-darkerblue transition-colors duration-200 hover:brightness-110 cursor-pointer"
          @click="confirm"
        >
          Confirm
        </button>
        <button
          type="button"
          class="min-h-[44px] rounded-lg bg-nimiq-card-elevated px-4 font-medium transition-colors duration-200 hover:bg-white/10 cursor-pointer"
          @click="retry"
        >
          Try again
        </button>
      </div>
    </template>

    <router-link
      to="/convert"
      class="min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-nimiq-card border border-nimiq-border px-4 py-3 font-medium text-center transition-colors duration-200 hover:bg-nimiq-card-elevated cursor-pointer"
    >
      <IconExchange class="h-4 w-4 text-nimiq-blue-light" />
      Enter price manually
    </router-link>
  </div>
</template>
