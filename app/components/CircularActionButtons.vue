<template>
  <div class="action-panel" :class="{ 'action-panel--compact': compact, 'action-panel--offline': !isConnected }">
    <!-- 延迟提示 -->
    <div v-if="isDelaying && hasAnyAction && isConnected" class="delay-indicator">
      <span class="delay-dot"></span>
      等待看清出牌...
    </div>

    <!-- 左侧 2×2 小圆：吃/碰/胡/杠 -->
    <div class="action-grid">
      <button
        class="action-btn action-btn--small"
        :class="{ 'action-btn--active': hasChow, 'action-btn--highlight': hasChow && !isDelaying }"
        :disabled="!hasChow || isDelaying || isInteractionLocked || !isConnected"
        @click="$emit('action', 'chow')"
      >吃</button>

      <button
        class="action-btn action-btn--small"
        :class="{ 'action-btn--active': hasPeng, 'action-btn--highlight': hasPeng && !isDelaying }"
        :disabled="!hasPeng || isDelaying || isInteractionLocked || !isConnected"
        @click="$emit('action', 'peng')"
      >碰</button>

      <button
        class="action-btn action-btn--small"
        :class="{ 'action-btn--active': hasHu, 'action-btn--highlight': hasHu && !isDelaying }"
        :disabled="!hasHu || isDelaying || isInteractionLocked || !isConnected"
        @click="$emit('action', 'hu')"
      >胡</button>

      <button
        class="action-btn action-btn--small"
        :class="{ 'action-btn--active': hasKong, 'action-btn--highlight': hasKong && !isDelaying }"
        :disabled="!hasKong || isDelaying || isInteractionLocked || !isConnected"
        @click="$emit('action', 'kong')"
      >杠</button>
    </div>

    <!-- 右侧 大圆：摸 -->
    <button
      class="action-btn action-btn--draw"
      :class="{
        'action-btn--active': canDraw,
        'action-btn--highlight': canDraw && !isDelaying,
        'action-btn--freezing': isFreezing
      }"
      :style="isFreezing ? { '--freeze-progress': freezeProgress } : {}"
      :disabled="!canDraw || isDelaying || isInteractionLocked || !isConnected"
      @click="$emit('action', 'draw')"
    >
      <span v-if="isFreezing" class="freeze-progress-ring"></span>
      <span class="draw-label">摸</span>
    </button>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ActionType } from '~/types/game'

interface Props {
  availableActions: ActionType[]
  isConnected: boolean
  isInteractionLocked: boolean
  lastStateChangeAt: number
  nowTs: number
  highlightDelayMs: number
  compact?: boolean
  freezeUntil?: number
  freezeDurationMs?: number
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  highlightDelayMs: 2000
})

defineEmits<{ action: [type: string] }>()

const canDraw = computed(() => props.availableActions.includes(ActionType.DRAW))
const hasChow = computed(() => props.availableActions.includes(ActionType.CHOW))
const hasPeng = computed(() => props.availableActions.includes(ActionType.PENG))
const hasKong = computed(() =>
  props.availableActions.includes(ActionType.KONG) ||
  props.availableActions.includes(ActionType.CONCEALED_KONG) ||
  props.availableActions.includes(ActionType.EXTENDED_KONG)
)
const hasHu = computed(() => props.availableActions.includes(ActionType.HU))

const hasAnyPriorityAction = computed(() => hasChow.value || hasPeng.value || hasKong.value || hasHu.value)
const hasAnyAction = computed(() => hasAnyPriorityAction.value || canDraw.value)

const isDelaying = computed(() => {
  if (props.lastStateChangeAt === 0) return false
  return props.nowTs - props.lastStateChangeAt < props.highlightDelayMs
})

// 冻结进度
const isFreezing = computed(() => {
  return !!props.freezeUntil && props.nowTs < props.freezeUntil
})
const freezeProgress = computed(() => {
  if (!props.freezeUntil || !props.freezeDurationMs) return '0'
  const total = props.freezeDurationMs
  const remaining = Math.max(0, props.freezeUntil - props.nowTs)
  const elapsed = total - remaining
  return String(Math.min(1, Math.max(0, elapsed / total)))
})
</script>

<style scoped>
.action-panel {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(10, 25, 18, 0.92);
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  width: 100%;
  justify-content: flex-start;
}

.action-panel--compact {
  padding: 8px;
  gap: 8px;
}

/* 延迟提示 */
.delay-indicator {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  color: #ffd36a;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}
.delay-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #ffd36a; animation: pulse-dot 1s infinite;
}
@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* 左侧 2×2 网格 */
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

/* 基础按钮 */
.action-btn {
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  background: rgba(20, 40, 30, 0.85);
  color: rgba(255, 255, 255, 0.4);
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  transition: all 0.2s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* 小圆（吃碰胡杠） */
.action-btn--small {
  width: 44px;
  height: 44px;
  font-size: 0.85rem;
}

/* 大圆（摸） */
.action-btn--draw {
  width: 72px;
  height: 72px;
  font-size: 1.2rem;
  flex-shrink: 0;
}

/* 激活 */
.action-btn--active {
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
  cursor: pointer;
}

/* 高亮 */
.action-btn--highlight {
  border-color: rgba(70, 197, 116, 0.8);
  background: rgba(31, 138, 82, 0.9);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 0 14px rgba(70, 197, 116, 0.3);
  animation: pop 0.3s ease;
}
.action-btn--highlight:hover {
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(70, 197, 116, 0.5);
}
.action-btn--highlight:active {
  transform: scale(0.92);
}

/* 大圆高亮特殊色 */
.action-btn--draw.action-btn--highlight {
  background: linear-gradient(135deg, #1f8a52, #46c574);
  border-color: rgba(70, 197, 116, 0.9);
  box-shadow: 0 0 20px rgba(70, 197, 116, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 冻结进度动画 */
.action-btn--freezing {
  border-color: rgba(33, 150, 243, 0.5);
  background: rgba(10, 25, 18, 0.95);
  cursor: default;
  overflow: hidden;
  position: relative;
}

.freeze-progress-ring {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: conic-gradient(
    rgba(33, 150, 243, 0.6) calc(var(--freeze-progress, 0) * 360deg),
    transparent calc(var(--freeze-progress, 0) * 360deg)
  );
  mask: radial-gradient(circle, transparent 55%, black 58%);
  -webkit-mask: radial-gradient(circle, transparent 55%, black 58%);
  pointer-events: none;
  transition: background 0.1s linear;
  clip-path: circle(50%);
}

.draw-label {
  position: relative;
  z-index: 1;
}

/* 胡牌特殊色 */
.action-btn:nth-child(3).action-btn--highlight {
  background: linear-gradient(135deg, #c62828, #ef5350);
  border-color: rgba(239, 83, 80, 0.8);
  box-shadow: 0 0 14px rgba(239, 83, 80, 0.4);
  animation: pop 0.3s ease, hu-glow 1s infinite;
}
@keyframes hu-glow {
  0%, 100% { box-shadow: 0 0 14px rgba(239, 83, 80, 0.4); }
  50% { box-shadow: 0 0 24px rgba(239, 83, 80, 0.7); }
}

@keyframes pop {
  0% { transform: scale(0.8); opacity: 0.5; }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); opacity: 1; }
}

/* 离线 */
.action-panel--offline {
  opacity: 0.4;
  pointer-events: none;
}

/* 紧凑 */
.action-panel--compact .action-btn--small { width: 36px; height: 36px; font-size: 0.75rem; }
.action-panel--compact .action-btn--draw { width: 56px; height: 56px; font-size: 1rem; }
.action-panel--compact .action-grid { gap: 4px; }

/* 过按钮 */
.action-btn--pass {
  width: 44px; height: 44px; border-radius: 50%; font-size: 0.85rem;
  background: rgba(80, 80, 80, 0.6); color: #ccc;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
}
.action-btn--pass.action-btn--highlight { border-color: rgba(255, 200, 50, 0.6); color: #ffd36a; }
.action-btn--pass:disabled { opacity: 0.3; cursor: not-allowed; }

@media (max-width: 768px) {
  .action-btn--small { width: 40px; height: 40px; }
  .action-btn--draw { width: 64px; height: 64px; font-size: 1.1rem; }
}
</style>
