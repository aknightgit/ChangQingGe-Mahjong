<!-- error.vue (Nuxt global error page) — 只显示错误，不自动跳转不自动刷新 -->
<template>
  <div class="error-page">
    <div class="error-card">
      <h1 class="error-code">{{ error.statusCode }}</h1>
      <p class="error-message">{{ errorMessage }}</p>
      <p class="error-hint">页面加载失败，请返回大厅重新操作</p>
      <button class="error-btn" @click="goHome">返回大厅</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  error: {
    type: Object,
    default: () => ({ statusCode: 500 }),
  },
})

const errorMessage = computed(() => {
  const msg = props.error?.message || props.error?.statusMessage || ''
  return msg || (props.error?.statusCode === 404 ? '页面不存在' : '加载失败，请检查网络后重试')
})

const goHome = () => {
  clearError()
  navigateTo('/mahjong/')
}
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  color: #f5f5f5;
  padding: 24px;
}
.error-card {
  text-align: center;
  max-width: 400px;
}
.error-code {
  font-size: 3rem;
  color: #e74c3c;
  margin: 0 0 12px;
}
.error-message {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 8px;
}
.error-hint {
  font-size: 0.85rem;
  opacity: 0.6;
  margin-bottom: 24px;
}
.error-btn {
  padding: 12px 32px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}
</style>
