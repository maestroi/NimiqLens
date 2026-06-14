<script setup lang="ts">
import { onMounted } from 'vue'
import { useWalletStore } from './stores/wallet'

const walletStore = useWalletStore()

onMounted(() => {
  walletStore.init()
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white">
    <router-view />
    <nav class="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 flex">
      <router-link to="/" class="flex-1 text-center py-3 min-h-[44px] text-sm">Home</router-link>
      <router-link to="/convert" class="flex-1 text-center py-3 min-h-[44px] text-sm">Convert</router-link>
      <router-link to="/scan" class="flex-1 text-center py-3 min-h-[44px] text-sm">Scan</router-link>
      <router-link to="/rates" class="flex-1 text-center py-3 min-h-[44px] text-sm">Rates</router-link>
      <router-link to="/about" class="flex-1 text-center py-3 min-h-[44px] text-sm">About</router-link>
    </nav>
  </div>
</template>
