<template>
  <div class="spectate-redirect">
    <div class="loading-spinner"></div>
    <p class="loading-text">正在进入观赛模式...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { navigateTo } from 'nuxt/app'

const route = useRoute()
const roomId = route.params.roomId as string

onMounted(() => {
  // 直接跳转到gameroom页面，带spectator参数
  navigateTo(`/mahjong/gameroom/${roomId}?spectator=1`, { external: false })
})
</script>

<style scoped>
.spectate-redirect {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0f1729;
  color: #e0e6ed;
}
.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #4fc3f7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text {
  margin-top: 12px;
  color: rgba(255,255,255,0.5);
  font-size: 0.85rem;
}
</style>
