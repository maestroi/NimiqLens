import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { installNimiqPayTapBridge } from './lib/nimiqPayTapBridge'
import './style.css'

installNimiqPayTapBridge()

createApp(App).use(createPinia()).use(router).mount('#app')
