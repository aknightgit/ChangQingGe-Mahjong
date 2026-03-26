<template>
  <div v-if="isConnected && !isInteractionLocked" class="circular-actions" :class="{ 'circular-actions--compact': compact }">
    <!-- 延迟提示 -->
    <div v-if="isDelaying && hasAnyAction" class="delay-indicator">
      <span class="delay-dot"></span>
      等待看清出牌...
    </div>

    <!-- 中心大圆：摸 -->
    <button
      class="action-btn action-btn--center"
      :class="{ 'action-btn--active': canDraw, 'action-btn--highlight': canDraw && !isDelaying }"
      :disabled="!canDraw || isDelaying || isInteractionLocked"
      @click="$emit('action', 'draw')"
    >
      <span class="action-btn__label">摸</span>
    </button>

    <!-- 上：吃 -->
    <button
      class="action-btn action-btn--top"
      :class="{ 'action-btn--active': hasChow, 'action-btn--highlight': hasChow && !isDelaying }"
      :disabled="!hasChow || isDelaying || isInteractionLocked"
      @click="$emit('action', 'chow')"
    >
      <span class="action-btn__label">吃</span>
    </button>

    <!-- 右：碰 -->
    <button
      class="action-btn action-btn--right"
      :class="{ 'action-btn--active': hasPeng, 'action-btn--highlight': hasPeng && !isDelaying }"
      :disabled="!hasPeng || isDelaying || isInteractionLocked"
      @click="$emit('action', 'peng')"
    >
      <span class="action-btn__label">碰</span>
    </button>

    <!-- 下：杠 -->
    <button
      class="action-btn action-btn--bottom"
      :class="{ 'action-btn--active': hasKong, 'action-btn--highlight': hasKong && !isDelaying }"
      :disabled="!hasKong || isDelaying || isInteractionLocked"
      @click="$emit('action', 'kong')"
    >
      <span class="action-btn__label">杠</span>
    </button>

    <!-- 左：胡 -->
    <button
      class="action-btn action-btn--left"
      :class="{ 'action-btn--active': hasHu, 'action-btn--highlight': hasHu && !isDelaying }"
      :disabled="!hasHu || isDelaying || isInteractionLocked"
      @click="$emit('action', 'hu')"
    >
      <span class="action-btn__label">胡</span>
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
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  highlightDelayMs: 2000
})

defineEmits<{
  action: [type: string]
}>()

const canDraw = computed(() => props.availableActions.includes(ActionType.DRAW))
const hasChow = computed(() => props.availableActions.includes(ActionType.CHOW))
const hasPeng = computed(() => props.availableActions.includes(ActionType.PENG))
const hasKong = computed(() =>
  props.availableActions.includes(ActionType.KONG) ||
  props.availableActions.includes(ActionType.CONCEALED_KONG) ||
  props.availableActions.includes(ActionType.EXTENDED_KONG)
)
const hasHu = computed(() => props.availableActions.includes(ActionType.HU))

const hasAnyPriorityAction = computed(
  () => hasChow.value || hasPeng.value || hasKong.value || hasHu.value
)

const hasAnyAction = computed(
  () => hasAnyPriorityAction.value || canDraw.value
)

// 延迟高亮逻辑
const isDelaying = computed(() => {
  if (props.lastStateChangeAt === 0) return false
  return props.nowTs - props.lastStateChangeAt < props.highlightDelayMs
})
</script>

<style scoped>
.circular-actions {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 180px;
  height: 180px;
  z-index: 20;
}

.circular-actions--compact {
  width: 140px;
  height: 140px;
}

/* 延迟提示 */
.delay-indicator {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  color: #ffd36a;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  animation: fadeIn 0.3s ease;
}

.delay-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd36a;
  animation: pulse-dot 1s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* 基础按钮样式 */
.action-btn {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
  background: rgba(15, 35, 25, 0.85);
  color: #fff;
  cursor: default;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.action-btn:disabled {
  cursor: default;
}

.action-btn__label {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* 中心大圆 */
.action-btn--center {
  width: 80px;
  height: 80px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1rem;
}

.action-btn--center .action-btn__label {
  font-size: 1.15rem;
}

/* 激活状态（可用但未高亮 / 延迟中） */
.action-btn--active {
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
  cursor: pointer;
}

/* 高亮状态（可用 + 延迟结束） */
.action-btn--highlight {
  border-color: rgba(70, 197, 116, 0.8);
  background: rgba(31, 138, 82, 0.9);
  color: #fff;
  cursor: pointer;
  animation: highlight-pop 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 20px rgba(70, 197, 116, 0.35), 0 4px 12px rgba(0, 0, 0, 0.4);
}

.action-btn--highlight:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 0 28px rgba(70, 197, 116, 0.5), 0 6px 16px rgba(0, 0, 0, 0.5);
}

.action-btn--highlight:active {
  transform: translate(-50%, -50%) scale(0.95);
}

@keyframes highlight-pop {
  0% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.6; }
  50% { transform: translate(-50%, -50%) scale(1.08); }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

/* 四周小圆位置 */
.action-btn--top,
.action-btn--right,
.action-btn--bottom,
.action-btn--left {
  width: 50px;
  height: 50px;
}

.action-btn--top {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.action-btn--top.action-btn--highlight {
  transform: translateX(-50%) scale(1);
}
.action-btn--top.action-btn--highlight:hover {
  transform: translateX(-50%) scale(1.1);
}

.action-btn--right {
  top: 50%;
  right: 0;
  transform: translateY(-50%);
}

.action-btn--right.action-btn--highlight:hover {
  transform: translateY(-50%) scale(1.1);
}

.action-btn--bottom {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}

.action-btn--bottom.action-btn--highlight:hover {
  transform: translateX(-50%) scale(1.1);
}

.action-btn--left {
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}

.action-btn--left.action-btn--highlight:hover {
  transform: translateY(-50%) scale(1.1);
}

/* 紧凑模式 */
.circular-actions--compact .action-btn--center {
  width: 64px;
  height: 64px;
}

.circular-actions--compact .action-btn--center .action-btn__label {
  font-size: 1rem;
}

.circular-actions--compact .action-btn--top,
.circular-actions--compact .action-btn--right,
.circular-actions--compact .action-btn--bottom,
.circular-actions--compact .action-btn--left {
  width: 42px;
  height: 42px;
}

.circular-actions--compact .action-btn__label {
  font-size: 0.8rem;
}

/* 移动端 */
@media (max-width: 768px) {
  .circular-actions {
    bottom: 16px;
    right: 16px;
    width: 150px;
    height: 150px;
  }

  .action-btn--center {
    width: 68px;
    height: 68px;
  }

  .action-btn--top,
  .action-btn--right,
  .action-btn--bottom,
  .action-btn--left {
    width: 44px;
    height: 44px;
  }

  .action-btn__label {
    font-size: 0.85rem;
  }

  .action-btn--center .action-btn__label {
    font-size: 1rem;
  }
}
</style>
