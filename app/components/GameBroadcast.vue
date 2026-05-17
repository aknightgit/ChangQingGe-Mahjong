<template>
  <div class="broadcast-panel">
    <div v-if="messages.length > 0" class="broadcast-header">
      <span class="broadcast-icon">📢</span>
      <span class="broadcast-title">牌局快讯</span>
    </div>
    <div class="broadcast-scroll" ref="scrollContainer">
      <div v-if="messages.length === 0" class="broadcast-empty">暂无消息</div>
      <TransitionGroup name="broadcast-slide">
        <div
          v-for="msg in visibleMessages"
          :key="msg.id"
          class="broadcast-msg"
          :class="`broadcast-msg--${msg.type}`"
        >
          <span class="broadcast-time">{{ msg.timeLabel }}</span>
          <span class="broadcast-text">{{ msg.text }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
interface BroadcastMessage {
  id: number
  text: string
  type: 'info' | 'warn' | 'special' | 'win'
  timestamp: number
  timeLabel: string
}

const props = defineProps<{
  messages: BroadcastMessage[]
}>()

const MAX_VISIBLE = 5

const visibleMessages = computed(() => {
  return props.messages.slice(-MAX_VISIBLE)
})

const scrollContainer = ref<HTMLElement | null>(null)

watch(() => props.messages.length, () => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  })
})
</script>

<style scoped>
.broadcast-panel {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
  font-size: 0.7rem;
}

.broadcast-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.broadcast-icon,
.broadcast-title {
  font-size: 0.7rem;
}

.broadcast-title {
  font-weight: 700;
  opacity: 0.8;
}

.broadcast-scroll {
  padding: 2px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-height: 250px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.broadcast-msg {
  display: flex;
  align-items: flex-start;
  gap: 3px;
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 0.7rem;
  line-height: 1.2;
  background: rgba(255, 255, 255, 0.03);
  animation: msg-in 0.3s ease;
}

.broadcast-empty {
  text-align: center;
  padding: 3px 4px;
  font-size: 0.7rem;
  opacity: 0.35;
  color: rgba(255,255,255,0.5);
}

.broadcast-time {
  opacity: 0.4;
  font-size: 0.7rem;
  flex-shrink: 0;
  margin-top: 0;
}

.broadcast-scroll::-webkit-scrollbar {
  width: 4px;
}

.broadcast-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.broadcast-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.broadcast-msg--warn {
  background: rgba(255, 152, 0, 0.08);
  border-left: 2px solid rgba(255, 152, 0, 0.5);
}

.broadcast-msg--special {
  background: rgba(239, 83, 80, 0.08);
  border-left: 2px solid rgba(239, 83, 80, 0.5);
}

.broadcast-msg--win {
  background: rgba(255, 215, 0, 0.08);
  border-left: 2px solid rgba(255, 215, 0, 0.5);
}

.broadcast-msg--info {
  border-left: 2px solid rgba(33, 150, 243, 0.4);
}

.broadcast-text {
  flex: 1;
}

/* 进入动画 */
.broadcast-slide-enter-active {
  transition: all 0.3s ease;
}
.broadcast-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes msg-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 统一紧凑：所有设备一致，去掉 --other-tile-scale 依赖 */
@media (max-width: 900px) and (orientation: landscape) {
  .broadcast-panel { border-radius: 4px; }
  .broadcast-header { padding: 2px 6px; gap: 3px; }
  .broadcast-icon, .broadcast-title { font-size: 0.7rem; }
  .broadcast-scroll { padding: 1px 4px; gap: 1px; max-height: 120px; }
  .broadcast-msg { font-size: 0.7rem; line-height: 1.1; padding: 1px 3px; gap: 2px; border-left-width: 1px; }
  .broadcast-time { font-size: 0.7rem; }
  .broadcast-empty { font-size: 0.7rem; padding: 1px 2px; }
}

@media (max-width: 500px) {
  .broadcast-panel { border-radius: 4px; }
  .broadcast-header { padding: 2px 6px; gap: 3px; }
  .broadcast-icon, .broadcast-title { font-size: 0.55rem; }
  .broadcast-scroll { padding: 1px 4px; gap: 1px; max-height: 120px; }
  .broadcast-msg { font-size: 0.55rem; line-height: 1.1 !important; padding: 0px 4px; gap: 2px; border-left-width: 1px; margin: 0; }
  .broadcast-time { font-size: 0.55rem; }
  .broadcast-empty { font-size: 0.55rem; padding: 2px 4px; }
}

@media (max-width: 500px) {
  .broadcast-panel { border-radius: 4px; font-size: 0.65rem; }
  .broadcast-header { padding: 2px 6px; gap: 3px; }
  .broadcast-icon { font-size: 0.6rem; }
  .broadcast-title { font-size: 0.6rem; }
  .broadcast-scroll { padding: 2px 4px; gap: 1px; max-height: 120px; }
  .broadcast-msg { font-size: 0.55rem; line-height: 1.1 !important; padding: 1px 4px; gap: 3px; border-left-width: 1px; margin: 0; }
  .broadcast-time { font-size: 0.48rem; }
  .broadcast-empty { font-size: 0.55rem; padding: 6px 4px; }
}
</style>
