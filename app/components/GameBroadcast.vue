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
  font-size: calc(0.7rem * var(--other-tile-scale, 1));
}

.broadcast-header {
  display: flex;
  align-items: center;
  gap: calc(6px * var(--other-tile-scale, 1));
  padding: calc(8px * var(--other-tile-scale, 1)) calc(12px * var(--other-tile-scale, 1));
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.broadcast-icon {
  font-size: calc(0.7rem * var(--other-tile-scale, 1));
}

.broadcast-title {
  font-size: calc(0.7rem * var(--other-tile-scale, 1));
  font-weight: 700;
  opacity: 0.8;
}

.broadcast-scroll {
  padding: calc(4px * var(--other-tile-scale, 1)) calc(8px * var(--other-tile-scale, 1));
  display: flex;
  flex-direction: column;
  gap: calc(2px * var(--other-tile-scale, 1));
  max-height: calc(250px * var(--other-tile-scale, 1));
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.broadcast-msg {
  display: flex;
  align-items: flex-start;
  gap: calc(4px * var(--other-tile-scale, 1));
  padding: calc(3px * var(--other-tile-scale, 1)) calc(6px * var(--other-tile-scale, 1));
  border-radius: calc(8px * var(--other-tile-scale, 1));
  font-size: calc(0.7rem * var(--other-tile-scale, 1));
  line-height: 1.2;
  background: rgba(255, 255, 255, 0.03);
  animation: msg-in 0.3s ease;
}

.broadcast-empty {
  text-align: center;
  padding: calc(16px * var(--other-tile-scale, 1)) calc(8px * var(--other-tile-scale, 1));
  font-size: calc(0.7rem * var(--other-tile-scale, 1));
  opacity: 0.35;
  color: rgba(255,255,255,0.5);
}

.broadcast-time {
  opacity: 0.4;
  font-size: calc(0.7rem * var(--other-tile-scale, 1));
  flex-shrink: 0;
  margin-top: calc(1px * var(--other-tile-scale, 1));
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

@media (max-width: 900px) and (orientation: landscape) {
  .broadcast-panel { border-radius: 6px; }
  .broadcast-header { padding: calc(3px * var(--other-tile-scale, 1)) calc(6px * var(--other-tile-scale, 1)); gap: calc(4px * var(--other-tile-scale, 1)); }
  .broadcast-icon { font-size: calc(0.7rem * var(--other-tile-scale, 1)); }
  .broadcast-title { font-size: calc(0.7rem * var(--other-tile-scale, 1)); }
  .broadcast-scroll { padding: calc(1px * var(--other-tile-scale, 1)) calc(4px * var(--other-tile-scale, 1)); gap: calc(1px * var(--other-tile-scale, 1)); max-height: calc(120px * var(--other-tile-scale, 1)); }
  .broadcast-msg { font-size: calc(0.7rem * var(--other-tile-scale, 1)); line-height: 1.1; padding: calc(1px * var(--other-tile-scale, 1)) calc(3px * var(--other-tile-scale, 1)); gap: calc(2px * var(--other-tile-scale, 1)); }
  .broadcast-time { font-size: calc(0.7rem * var(--other-tile-scale, 1)); }
  .broadcast-empty { font-size: calc(0.7rem * var(--other-tile-scale, 1)); padding: calc(6px * var(--other-tile-scale, 1)) calc(4px * var(--other-tile-scale, 1)); }
}

@media (max-width: 500px) {
  .broadcast-panel { border-radius: 4px; font-size: 0.7rem; }
  .broadcast-header { padding: 2px 6px; gap: 3px; }
  .broadcast-icon { font-size: 0.7rem; }
  .broadcast-title { font-size: 0.7rem; }
  .broadcast-scroll { padding: 1px 4px; gap: 1px; max-height: 120px; }
  .broadcast-msg { font-size: 0.7rem; line-height: 1.1 !important; padding: 0px 4px; gap: 2px; border-left-width: 1px; margin: 0; }
  .broadcast-time { font-size: 0.7rem; }
  .broadcast-empty { font-size: 0.7rem; padding: 6px 4px; }
}
</style>
