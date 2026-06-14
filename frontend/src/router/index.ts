import { createRouter, createWebHistory } from 'vue-router'
import WelcomeView from '../views/WelcomeView.vue'
import ConverterView from '../views/ConverterView.vue'
import ScanView from '../views/ScanView.vue'
import RatesView from '../views/RatesView.vue'
import AboutView from '../views/AboutView.vue'
import OnboardingView from '../views/OnboardingView.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'welcome', component: WelcomeView },
    { path: '/convert', name: 'convert', component: ConverterView },
    { path: '/scan', name: 'scan', component: ScanView },
    { path: '/rates', name: 'rates', component: RatesView },
    { path: '/about', name: 'about', component: AboutView },
    { path: '/onboarding', name: 'onboarding', component: OnboardingView },
  ],
})
