import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export default defineNuxtPlugin(() => {
  if (!process.client || !Capacitor.isNativePlatform()) return

  const router = useRouter()

  CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
    const path = router.currentRoute.value.path

    if (path.startsWith('/gameroom/')) {
      await router.push('/')
      return
    }

    if (path !== '/' && path !== '/login') {
      if (canGoBack) window.history.back()
      else await router.push('/')
      return
    }

    await CapacitorApp.exitApp()
  })
})
