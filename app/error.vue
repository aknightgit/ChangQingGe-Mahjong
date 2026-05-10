<!-- error.vue (Nuxt global error page) — 仅作为兜底，自动跳回首页 -->
<template>
  <div class="error-page">
    <div class="error-card">
      <div class="loading-spinner"></div>
      <p class="loading-text">正在进入牌桌...</p>
    </div>
  </div>
</template>

<script setup>
const runtimeConfig = useRuntimeConfig()
const props = defineProps({
  error: {
    type: Object,
    default: () => ({ statusCode: 500 }),
  },
})

const baseURL = runtimeConfig.app.baseURL || '/'
const isGameroom404 = props.error?.statusCode === 404 &&
  typeof window !== 'undefined' &&
  window.location.pathname.startsWith(baseURL.replace(/\/$/, '') + '/gameroom/')

onMounted(() => {
  // gameroom 404：延迟后刷新页面（可能是建房后数据未就绪）
  if (isGameroom404) {
    setTimeout(() => {
      window.location.reload()
    }, 1200)
    return
  }

  // 其他 404/错误：直接跳回首页
  setTimeout(() => {
    window.location.href = baseURL
  }, 800)
})
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #f5f5f5;
  padding: 24px;
}

.error-card {
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.12);
  border-top-color: #46c574;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1rem;
  opacity: 0.8;
  letter-spacing: 0.02em;
}
</style>
