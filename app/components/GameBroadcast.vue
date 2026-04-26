<template>
  <div class="broadcast-panel">
    <div class="broadcast-header">
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
}

.broadcast-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.broadcast-icon {
  font-size: 0.85rem;
}

.broadcast-title {
  font-size: 0.8rem;
  font-weight: 700;
  opacity: 0.8;
}

.broadcast-scroll {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 250px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
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

.broadcast-msg {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 8px;
  font-size: 0.75rem;
  line-height: 1.4;
  background: rgba(255, 255, 255, 0.03);
  animation: msg-in 0.3s ease;
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

.broadcast-empty {
  text-align: center;
  padding: 16px 8px;
  font-size: 0.75rem;
  opacity: 0.35;
  color: rgba(255,255,255,0.5);
}

.broadcast-time {
  opacity: 0.4;
  font-size: 0.65rem;
  flex-shrink: 0;
  margin-top: 1px;
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
</style>
