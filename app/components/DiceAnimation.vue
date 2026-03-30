<template>
  <Transition name="dice-fade">
    <div v-if="visible" class="dice-overlay">
      <!-- 粒子背景 -->
      <div class="particles">
        <span v-for="n in 30" :key="n" class="particle" :style="particleStyle(n)" />
      </div>

      <div class="dice-container">
        <!-- 四倍爆灯特效（不遮挡发牌按钮） -->
        <Transition name="quad-pop">
          <div v-if="showQuadBurst" class="quad-burst">
            <span class="quad-text">四倍！</span>
            <span class="quad-sub">🔥🔥🔥</span>
          </div>
        </Transition>

        <!-- 阶段0: 等待庄家点击掷骰 -->
        <template v-if="phase === 'idle'">
          <div class="dice-idle-phase">
            <p class="dice-hint" style="font-size: 1.1rem; margin-bottom: 16px;">
              {{ dealerName ? `${dealerName} 掷骰子` : '等待掷骰子...' }}
            </p>
            <div
              class="dice-row"
              :class="{ 'dice-row--clickable': isDealer }"
              @click="isDealer && onRoll()"
            >
              <Dice3D :value="1" :state="'idle'" />
              <Dice3D :value="1" :state="'idle'" />
            </div>
            <p class="dice-hint" v-if="maxRollsLimit > 1" style="margin-top: 8px;">{{ currentRoll }}/{{ maxRollsLimit }}</p>
            <button v-if="isDealer" class="deal-button" style="margin-top: 16px;" @click="onProceedToDeal">
              <span class="deal-icon">🃏</span> 发牌
            </button>
            <p v-if="!isDealer" class="dice-hint" style="margin-top: 16px;">等待庄家掷骰子...</p>
          </div>
        </template>

        <!-- 阶段1: 掷骰子动画中 -->
        <template v-if="phase === 'rolling'">
          <div class="dice-row">
            <Dice3D :value="1" :state="'rolling'" :delay="0" />
            <Dice3D :value="1" :state="'rolling'" :delay="0.1" />
          </div>
          <p class="dice-rolling-label">🎲 掷骰子...</p>
        </template>

        <!-- 阶段2: 掷骰结果 -->
        <template v-if="phase === 'result'">
          <div class="dice-result-phase">
            <div
              class="dice-row"
              :class="{ 'dice-row--clickable': canReroll && isDealer }"
              @click="canReroll && isDealer && onReroll()"
            >
              <Dice3D :value="dice1" :state="'landed'" />
              <Dice3D :value="dice2" :state="'landed'" />
            </div>
            <p class="dice-total">
              <span class="dice-total-num">{{ dice1 + dice2 }}</span> 点
            </p>
            <p class="dice-hint">{{ dealerName ? `庄家: ${dealerName}` : '' }}</p>
            <p class="dice-hint" v-if="maxRollsLimit > 1">{{ currentRoll }}/{{ maxRollsLimit }}</p>
            <p class="dice-hint" v-if="canReroll && isDealer" style="font-size: 0.75rem; opacity: 0.5;">点击骰子可重掷</p>
            <button v-if="isDealer" class="deal-button" style="margin-top: 12px;" @click="onProceedToDeal">
              <span class="deal-icon">🃏</span> 发牌
            </button>
            <p v-if="!isDealer" class="dice-hint" style="margin-top: 12px;">等待庄家操作...</p>
          </div>
        </template>

        <!-- 阶段3: 发牌确认 -->
        <template v-if="phase === 'deal'">
          <div class="deal-phase">
            <div class="dice-row">
              <Dice3D :value="dice1" :state="'landed'" />
              <Dice3D :value="dice2" :state="'landed'" />
            </div>
            <p class="deal-total">{{ dice1 + dice2 }} 点</p>
            <p class="deal-hint-row">{{ dealerName ? `庄家: ${dealerName}` : '' }}</p>
            <button class="deal-button" @click="onDeal">
              <span class="deal-icon">🃏</span> 发牌
            </button>
            <p class="deal-hint">点击开始正式发牌</p>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import Dice3D from './Dice3D.vue'

const props = defineProps<{
  dice1: number
  dice2: number
  dealerName: string
  maxRolls?: number
  isDealer?: boolean
}>()

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'deal'): void
  (e: 'roll'): void
}>()

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

const visible = ref(true)
const phase = ref<'idle' | 'rolling' | 'result' | 'deal'>('idle')
const currentRoll = ref(0)
const maxRollsLimit = computed(() => props.maxRolls || 1)
const canReroll = computed(() => currentRoll.value < maxRollsLimit.value && phase.value === 'result')
const showQuadBurst = ref(false)

// 是否是四倍组合（1+1 或 4+4）
const isQuadCombo = computed(() => {
  return (props.dice1 === 1 && props.dice2 === 1) || (props.dice1 === 4 && props.dice2 === 4)
})

// 粒子样式
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

const onRoll = () => {
  currentRoll.value++
  emit('roll')
  phase.value = 'rolling'
  showQuadBurst.value = false

  // 0.8s 滚动动画后显示结果
  setTimeout(() => {
    phase.value = 'result'
    // 检查是否四倍组合
    if (isQuadCombo.value) {
      showQuadBurst.value = true
      // 1.5s 后自动隐藏四倍特效
      setTimeout(() => {
        showQuadBurst.value = false
      }, 1500)
    }
  }, 850)
}

const onReroll = () => onRoll()

const onProceedToDeal = () => {
  phase.value = 'deal'
}

onMounted(() => {
  currentRoll.value = 0
  phase.value = 'idle'
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

/* ===== 四倍爆灯特效 ===== */
.quad-burst {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
  pointer-events: none;
}

.quad-text {
  display: block;
  font-size: 3rem;
  font-weight: 900;
  color: #ff4444;
  text-shadow:
    0 0 20px rgba(255, 68, 68, 0.8),
    0 0 40px rgba(255, 68, 68, 0.4),
    0 2px 0 #cc0000;
  animation: quad-pulse 0.5s ease-out;
  letter-spacing: 0.15em;
}

.quad-sub {
  display: block;
  font-size: 1.5rem;
  margin-top: 4px;
  animation: quad-pulse 0.5s ease-out 0.1s both;
}

@keyframes quad-pulse {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.quad-pop-enter-active {
  animation: quad-pulse 0.4s ease-out;
}

.quad-pop-leave-active {
  transition: opacity 0.3s ease;
}

.quad-pop-leave-to {
  opacity: 0;
}

/* ===== 骰子行 ===== */
.dice-row {
  display: flex;
  gap: 48px;
  justify-content: center;
  margin-bottom: 24px;
  perspective: 600px;
}

.dice-row--clickable {
  cursor: pointer;
  transition: transform 0.2s;
}

.dice-row--clickable:hover {
  transform: scale(1.05);
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

/* ===== 结果阶段 ===== */
.dice-result-phase {
  animation: result-in 0.5s ease-out;
  text-align: center;
}

@keyframes result-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 发牌阶段 ===== */
.deal-phase {
  animation: deal-phase-in 0.6s ease-out;
}

@keyframes deal-phase-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.deal-total {
  color: #ffd700;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 20px;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
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
