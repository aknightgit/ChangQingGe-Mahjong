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
        :class="{
          'action-btn--active': hasChow,
          'action-btn--highlight': hasChow && !isDelaying,
          'action-btn--highlight-pulse': hasChow
        }"
        :disabled="!hasChow || isInteractionLocked || !isConnected"
        @click="$emit('action', 'chow')"
      >吃</button>

      <button
        class="action-btn action-btn--small"
        :class="{
          'action-btn--active': hasPeng,
          'action-btn--highlight': hasPeng && !isDelaying,
          'action-btn--highlight-pulse': hasPeng
        }"
        :disabled="!hasPeng || isInteractionLocked || !isConnected"
        @click="$emit('action', 'peng')"
      >碰</button>

      <button
        class="action-btn action-btn--small"
        :class="{ 'action-btn--active': hasHu, 'action-btn--highlight': hasHu && !isDelaying, 'action-btn--highlight-pulse': hasHu }"
        :disabled="!hasHu || isInteractionLocked || !isConnected"
        @click="$emit('action', 'hu')"
      >胡</button>

      <button
        class="action-btn action-btn--small"
        :class="{ 'action-btn--active': hasKong, 'action-btn--highlight': hasKong && !isDelaying, 'action-btn--highlight-pulse': hasKong }"
        :disabled="!hasKong || isInteractionLocked || !isConnected"
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
      :style="isFreezing ? { '--freeze-progress': freezeProgress, '--freeze-duration-ms': `${safeFreezeDurationMs}ms` } : {}"
      :disabled="!canDraw || isFreezing || isInteractionLocked || !isConnected"
      @click="$emit('action', 'draw')"
    >
      <span v-if="isFreezing" class="freeze-progress-ring"></span>
      <span class="draw-label">摸</span>
    </button>

    <!-- 第二行：特殊操作按钮 -->
    <div class="action-grid-secondary" v-if="hasAnySecondaryAction">
      <!-- 慢（容我想一想） -->
      <button
        v-if="hasThink"
        class="action-btn action-btn--small action-btn--think"
        :class="{
          'action-btn--active': hasThink,
          'action-btn--highlight': hasThink && !isDelaying,
          'action-btn--disabled': !canUseThink
        }"
        :disabled="!hasThink || !effectiveCanUseThink || isInteractionLocked || !isConnected"
        @click="$emit('action', 'think')"
      >慢{{ effectiveThinkRemaining > 0 ? effectiveThinkRemaining : '' }}</button>

      <!-- 造反 -->
      <button
        v-if="hasRebel"
        class="action-btn action-btn--small action-btn--rebel"
        :class="{
          'action-btn--active': hasRebel,
          'action-btn--highlight': hasRebel && !isDelaying
        }"
        :disabled="!hasRebel || isInteractionLocked || !isConnected"
        @click="$emit('action', 'rebel')"
      >🚨</button>

      <!-- 梁山聚义 -->
      <button
        v-if="hasLiangShan"
        class="action-btn action-btn--small action-btn--liangshan"
        :class="{
          'action-btn--active': hasLiangShan,
          'action-btn--highlight': hasLiangShan && !isDelaying,
          'action-btn--voted': hasVotedLiangShan
        }"
        :disabled="!hasLiangShan || isInteractionLocked || !isConnected || effectiveHasVotedLiangShan"
        @click="$emit('action', 'liangshan')"
      >🔥</button>


    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
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
  hesitationWindow?: number
  thinkRemaining?: number
  canUseThink?: boolean
  hasVotedLiangshan?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  highlightDelayMs: 5000
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

// 特殊操作按钮
const hasThink = computed(() => props.availableActions.includes(ActionType.THINK))
const hasRebel = computed(() => props.availableActions.includes(ActionType.REBEL))
const hasLiangShan = computed(() => props.availableActions.includes(ActionType.LIANG_SHAN))

const hasAnySecondaryAction = computed(() => hasThink.value || hasRebel.value || hasLiangShan.value)

// 使用 props（父组件传入实际值）
const effectiveCanUseThink = computed(() => props.canUseThink ?? true)
const effectiveThinkRemaining = computed(() => props.thinkRemaining ?? 0)
const effectiveHasVotedLiangShan = computed(() => props.hasVotedLiangshan ?? false)

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
const safeFreezeDurationMs = computed(() => {
  const v = Number(props.hesitationWindow)
  return Number.isFinite(v) && v > 0 ? v : 1000
})

const freezeProgress = ref('0')
let freezeRafId: number | null = null

const animateFreeze = () => {
  if (!props.freezeUntil) {
    freezeProgress.value = '0'
    freezeRafId = null
    return
  }
  const now = Date.now()
  const remaining = props.freezeUntil - now
  if (remaining <= 0) {
    freezeProgress.value = '1'
    freezeRafId = null
    return
  }
  // 扇形和圆环统一用 freezeUntil 作为唯一时间源
  // progress = elapsed / total，其中 total = freezeUntil - freezeStart
  // freezeStart = freezeUntil - safeFreezeDurationMs（假设freezeUntil在freeze开始时设置）
  const total = safeFreezeDurationMs.value
  const elapsed = total - remaining
  freezeProgress.value = String(Math.min(1, Math.max(0, elapsed / total)))
  freezeRafId = requestAnimationFrame(animateFreeze)
}

watch(
  () => props.freezeUntil,
  (newUntil) => {
    if (freezeRafId) {
      cancelAnimationFrame(freezeRafId)
      freezeRafId = null
    }
    if (newUntil && newUntil > Date.now()) {
      freezeRafId = requestAnimationFrame(animateFreeze)
    } else {
      freezeProgress.value = '0'
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (freezeRafId) {
    cancelAnimationFrame(freezeRafId)
    freezeRafId = null
  }
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
  border-color: rgba(255, 255, 255, 0.88);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 0 14px rgba(255, 255, 255, 0.18);
  animation: pop 0.3s ease;
}
.action-btn--highlight:hover {
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.26);
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

.action-btn--small.action-btn--highlight-pulse {
  animation: action-breathe 1.35s ease-in-out infinite;
}

.action-btn--small:nth-child(1).action-btn--highlight {
  background: linear-gradient(135deg, #1d6ef2, #45a5ff);
  box-shadow: 0 0 18px rgba(51, 136, 255, 0.38);
}

.action-btn--small:nth-child(2).action-btn--highlight {
  background: linear-gradient(135deg, #e38b16, #ffc54d);
  box-shadow: 0 0 18px rgba(255, 180, 48, 0.34);
}

.action-btn--small:nth-child(3).action-btn--highlight {
  background: linear-gradient(135deg, #c62828, #ff6b6b);
  box-shadow: 0 0 18px rgba(255, 90, 90, 0.38);
}

.action-btn--small:nth-child(4).action-btn--highlight {
  background: linear-gradient(135deg, #7b3fe4, #b47cff);
  box-shadow: 0 0 18px rgba(164, 109, 255, 0.38);
}

@keyframes action-breathe {
  0%, 100% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(1.08);
    filter: brightness(1.14);
  }
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
  /* 扇形动画由 JS RAF 驱动，不再依赖 CSS transition */
  transition: none;
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

.action-btn--highlight-pulse {
  transform: scale(1.08);
  animation: claim-pulse-glow 1s ease-in-out infinite;
}

@keyframes claim-pulse-glow {
  0%, 100% {
    transform: scale(1.04);
    box-shadow: 0 0 14px rgba(70, 197, 116, 0.4), 0 0 22px rgba(70, 197, 116, 0.25);
  }
  50% {
    transform: scale(1.14);
    box-shadow: 0 0 22px rgba(70, 197, 116, 0.65), 0 0 36px rgba(70, 197, 116, 0.45);
  }
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

/* 第二行：特殊操作按钮 */
.action-grid-secondary {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}



/* 慢按钮（紫色） */
.action-btn--think {
  background: rgba(124, 58, 237, 0.3);
  color: rgba(255, 255, 255, 0.7);
  border-color: rgba(139, 92, 246, 0.3);
  font-size: 0.75rem;
}
.action-btn--think.action-btn--active {
  border-color: rgba(139, 92, 246, 0.6);
  color: #c4b5fd;
}
.action-btn--think.action-btn--highlight {
  background: rgba(124, 58, 237, 0.5);
  border-color: rgba(139, 92, 246, 0.8);
  color: #fff;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
}
.action-btn--think.action-btn--disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 造反按钮（红色心跳） */
.action-btn--rebel {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fff;
  border-color: #ffd700;
  animation: heartbeat 1.2s ease-in-out infinite;
}
.action-btn--rebel.action-btn--highlight {
  box-shadow: 0 0 16px rgba(239, 83, 80, 0.6);
}
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.08); }
  30% { transform: scale(1); }
  45% { transform: scale(1.05); }
  60% { transform: scale(1); }
}

/* 梁山聚义按钮（火焰红） */
.action-btn--liangshan {
  background: linear-gradient(135deg, rgba(198, 40, 40, 0.5), rgba(239, 83, 80, 0.35));
  color: #ff8a80;
  border-color: rgba(239, 83, 80, 0.6);
  font-size: 0.75rem;
  animation: liangshan-btn-pulse 2s ease-in-out infinite;
}
.action-btn--liangshan.action-btn--highlight {
  box-shadow: 0 0 16px rgba(239, 83, 80, 0.5);
}
.action-btn--liangshan.action-btn--voted {
  background: rgba(40, 40, 40, 0.5);
  color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  animation: none;
}
@keyframes liangshan-btn-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(239, 83, 80, 0.2); }
  50% { box-shadow: 0 0 16px rgba(239, 83, 80, 0.5); }
}

@media (max-width: 768px) {
  .action-btn--small { width: 40px; height: 40px; }
  .action-btn--draw { width: 64px; height: 64px; font-size: 1.1rem; }
}
</style>
