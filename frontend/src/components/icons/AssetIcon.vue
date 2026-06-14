<script setup lang="ts">
import type { Asset } from '../../lib/convert'
import IconNim from './IconNim.vue'
import IconBtc from './IconBtc.vue'
import IconEth from './IconEth.vue'
import IconUsdt from './IconUsdt.vue'

defineProps<{ asset: Asset }>()

const components: Record<Asset, typeof IconNim> = {
  NIM: IconNim,
  BTC: IconBtc,
  ETH: IconEth,
  USDT: IconUsdt,
}
</script>

<template>
  <component :is="components[asset]" />
</template>
