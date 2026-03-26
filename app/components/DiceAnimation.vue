<template>
  <Transition name="dice-fade">
    <div v-if="visible" class="dice-overlay">
      <!-- 粒子背景 -->
      <div class="particles">
        <span v-for="n in 30" :key="n" class="particle" :style="particleStyle(n)" />
      </div>

      <div class="dice-container">
        <!-- 阶段1: 掷骰子动画 -->
        <template v-if="phase === 'rolling'">
          <div class="dice-row">
            <div
              class="dice"
              :class="{ 'dice--rolling': isRolling, 'dice--landed': !isRolling }"
            >
              <span class="dice-face">{{ dice1Display }}</span>
              <div class="dice-glow" />
            </div>
            <div
              class="dice"
              :class="{ 'dice--rolling': isRolling, 'dice--landed': !isRolling }"
              style="animation-delay: 0.12s"
            >
              <span class="dice-face">{{ dice2Display }}</span>
              <div class="dice-glow" />
            </div>
          </div>

          <div class="dice-result" v-if="!isRolling">
            <p class="dice-total">
              <span class="dice-total-num">{{ dice1 + dice2 }}</span> 点
            </p>
            <p class="dice-hint">{{ dealerName ? `庄家: ${dealerName}` : '' }}</p>
          </div>
          <p v-else class="dice-rolling-label">🎲 掷骰子...</p>
        </template>

        <!-- 阶段2: 发牌确认按钮 -->
        <template v-if="phase === 'deal'">
          <div class="deal-phase">
            <div class="dice-final-row">
              <div class="dice dice--final">
                <span class="dice-face">{{ DICE_FACES[dice1] }}</span>
              </div>
              <div class="dice dice--final">
                <span class="dice-face">{{ DICE_FACES[dice2] }}</span>
              </div>
            </div>
            <p class="deal-total">{{ dice1 + dice2 }} 点</p>
            <p class="deal-hint-row">
              {{ dealerName ? `庄家: ${dealerName}` : '' }}
            </p>
            <button class="deal-button" @click="onDeal">
              <span class="deal-icon">🃏</span>
              发牌
            </button>
            <p class="deal-hint">点击开始正式发牌</p>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = defineProps<{
  dice1: number
  dice2: number
  dealerName: string
}>()

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'deal'): void
}>()

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

// 由父组件通过 v-if 控制显示/隐藏
const visible = ref(true)
const isRolling = ref(true)
const phase = ref<'rolling' | 'deal'>('rolling')
const dice1Display = ref('🎲')
const dice2Display = ref('🎲')

// 粒子样式生成
const particleStyle = (n: number) => {
  const hue = 120 + Math.random() * 60
  return {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 3}s`,
    animationDuration: `${2 + Math.random() * 3}s`,
    background: `hsla(${hue}, 80%, 60%, 0.6)`,
    width: `${3 + Math.random() * 5}px`,
    height: `${3 + Math.random() * 5}px`,
  }
}

// 当组件显示时（父组件v-if重新为true），重置状态
watch(() => visible.value, (val) => {
  if (val) {
    resetAnimation()
  }
})

const resetAnimation = () => {
  isRolling.value = true
  phase.value = 'rolling'
  dice1Display.value = '🎲'
  dice2Display.value = '🎲'

  // Phase 1: rolling animation
  const rollInterval = setInterval(() => {
    dice1Display.value = DICE_FACES[Math.floor(Math.random() * 6) + 1]
    dice2Display.value = DICE_FACES[Math.floor(Math.random() * 6) + 1]
  }, 70)

  // Stop rolling after 1.8s
  setTimeout(() => {
    clearInterval(rollInterval)
    dice1Display.value = DICE_FACES[props.dice1]
    dice2Display.value = DICE_FACES[props.dice2]
    isRolling.value = false
  }, 1800)

  // Transition to deal phase after 2.8s (longer so user can see dice result)
  setTimeout(() => {
    if (visible.value) {
      phase.value = 'deal'
    }
  }, 2800)
}

onMounted(() => {
  resetAnimation()
})

const onDeal = () => {
  visible.value = false
  emit('deal')
}
</script>

<style scoped>
.dice-overlay {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(10, 30, 20, 0.92), rgba(0, 0, 0, 0.95));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(6px);
}

/* ===== 粒子 ===== */
.particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0;
  animation: particle-float linear infinite;
  box-shadow: 0 0 6px currentColor;
}

@keyframes particle-float {
  0% { opacity: 0; transform: translateY(20px) scale(0); }
  20% { opacity: 0.8; transform: translateY(0) scale(1); }
  80% { opacity: 0.4; }
  100% { opacity: 0; transform: translateY(-80px) scale(0.3); }
}

/* ===== 容器 ===== */
.dice-container {
  text-align: center;
  position: relative;
  z-index: 1;
}

/* ===== 骰子 ===== */
.dice-row {
  display: flex;
  gap: 32px;
  justify-content: center;
  margin-bottom: 24px;
}

.dice {
  width: 90px;
  height: 90px;
  background: linear-gradient(145deg, #ffffff, #e8e8e8);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 0 0 2px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.dice-glow {
  position: absolute;
  inset: -4px;
  border-radius: 22px;
  background: conic-gradient(
    from 0deg,
    rgba(70, 197, 116, 0.6),
    rgba(255, 215, 0, 0.6),
    rgba(70, 197, 116, 0.6)
  );
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s;
}

.dice--rolling .dice-glow {
  opacity: 1;
  animation: glow-spin 0.8s linear infinite;
}

@keyframes glow-spin {
  to { transform: rotate(360deg); }
}

.dice--rolling {
  animation: dice-shake 0.12s infinite;
}

@keyframes dice-shake {
  0%, 100% { transform: rotate(0deg) scale(1); }
  20% { transform: rotate(-12deg) scale(1.08); }
  40% { transform: rotate(10deg) scale(1.05); }
  60% { transform: rotate(-6deg) scale(1.03); }
  80% { transform: rotate(8deg) scale(1.06); }
}

.dice--landed {
  animation: dice-land 0.4s ease-out;
}

@keyframes dice-land {
  0% { transform: scale(1.3) rotate(10deg); }
  50% { transform: scale(0.9) rotate(-3deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.dice--final {
  width: 70px;
  height: 70px;
  border-radius: 14px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(70, 197, 116, 0.2);
}

.dice-face {
  font-size: 3.2rem;
  line-height: 1;
  position: relative;
  z-index: 1;
}

.dice--final .dice-face {
  font-size: 2.5rem;
}

/* ===== 结果文字 ===== */
.dice-rolling-label {
  color: #ffd36a;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  animation: pulse-text 0.8s infinite;
}

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.dice-result {
  animation: result-in 0.5s ease-out;
}

@keyframes result-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.dice-total {
  color: #fff;
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 6px;
}

.dice-total-num {
  font-size: 2.2rem;
  color: #ffd700;
  text-shadow: 0 0 12px rgba(255, 215, 0, 0.5);
}

.dice-hint {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
  margin: 0;
}

/* ===== 发牌阶段 ===== */
.deal-phase {
  animation: deal-phase-in 0.6s ease-out;
}

@keyframes deal-phase-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.dice-final-row {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 12px;
}

.deal-total {
  color: #ffd700;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 20px;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
}

.deal-button {
  padding: 16px 48px;
  border-radius: 16px;
  border: 2px solid rgba(70, 197, 116, 0.6);
  background: linear-gradient(135deg, #1f8a52, #2eaa6a);
  color: #fff;
  font-size: 1.4rem;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.1em;
  box-shadow:
    0 0 30px rgba(70, 197, 116, 0.35),
    0 8px 24px rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  animation: deal-btn-pulse 2s infinite;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.deal-icon {
  font-size: 1.6rem;
}

@keyframes deal-btn-pulse {
  0%, 100% { box-shadow: 0 0 30px rgba(70, 197, 116, 0.35), 0 8px 24px rgba(0, 0, 0, 0.4); }
  50% { box-shadow: 0 0 50px rgba(70, 197, 116, 0.55), 0 8px 32px rgba(0, 0, 0, 0.5); }
}

.deal-button:hover {
  transform: translateY(-2px) scale(1.05);
  background: linear-gradient(135deg, #2eaa6a, #46c574);
}

.deal-button:active {
  transform: translateY(0) scale(0.98);
}

.deal-hint-row {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
  margin: 0 0 16px;
}

.deal-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  margin: 12px 0 0;
}

/* ===== 过渡动画 ===== */
.dice-fade-enter-active {
  transition: opacity 0.3s ease;
}

.dice-fade-leave-active {
  transition: opacity 0.5s ease;
}

.dice-fade-enter-from,
.dice-fade-leave-to {
  opacity: 0;
}
</style>
