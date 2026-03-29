<template>
  <Transition name="dice-fade">
    <div v-if="visible" class="dice-overlay">
      <!-- 粒子背景 -->
      <div class="particles">
        <span v-for="n in 30" :key="n" class="particle" :style="particleStyle(n)" />
      </div>

      <div class="dice-container">
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
              <div class="dice3d dice3d--idle" :class="'dice3d--face1'">
                <div class="dice3d-face dice3d-face--front"><div class="dot dot--center" /></div>
                <div class="dice3d-face dice3d-face--back"><div class="dot dot--tl" /><div class="dot dot--tr" /><div class="dot dot--ml" /><div class="dot dot--mr" /><div class="dot dot--bl" /><div class="dot dot--br" /></div>
                <div class="dice3d-face dice3d-face--right"><div class="dot dot--tl" /><div class="dot dot--center" /><div class="dot dot--br" /></div>
                <div class="dice3d-face dice3d-face--left"><div class="dot dot--tl" /><div class="dot dot--tr" /><div class="dot dot--bl" /><div class="dot dot--br" /></div>
                <div class="dice3d-face dice3d-face--top"><div class="dot dot--tl" /><div class="dot dot--tr" /><div class="dot dot--bl" /><div class="dot dot--br" /><div class="dot dot--center" /></div>
                <div class="dice3d-face dice3d-face--bottom"><div class="dot dot--tl" /><div class="dot dot--tr" /><div class="dot dot--ml" /><div class="dot dot--mr" /><div class="dot dot--bl" /><div class="dot dot--br" /></div>
              </div>
              <div class="dice3d dice3d--idle" :class="'dice3d--face1'">
                <div class="dice3d-face dice3d-face--front"><div class="dot dot--center" /></div>
                <div class="dice3d-face dice3d-face--back"><div class="dot dot--tl" /><div class="dot dot--tr" /><div class="dot dot--ml" /><div class="dot dot--mr" /><div class="dot dot--bl" /><div class="dot dot--br" /></div>
                <div class="dice3d-face dice3d-face--right"><div class="dot dot--tl" /><div class="dot dot--center" /><div class="dot dot--br" /></div>
                <div class="dice3d-face dice3d-face--left"><div class="dot dot--tl" /><div class="dot dot--tr" /><div class="dot dot--bl" /><div class="dot dot--br" /></div>
                <div class="dice3d-face dice3d-face--top"><div class="dot dot--tl" /><div class="dot dot--tr" /><div class="dot dot--bl" /><div class="dot dot--br" /><div class="dot dot--center" /></div>
                <div class="dice3d-face dice3d-face--bottom"><div class="dot dot--tl" /><div class="dot dot--tr" /><div class="dot dot--ml" /><div class="dot dot--mr" /><div class="dot dot--bl" /><div class="dot dot--br" /></div>
              </div>
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
            <div class="dice3d dice3d--bounce" :style="{ animationDelay: '0s' }">
              <div class="dice3d-face dice3d-face--front" /><div class="dice3d-face dice3d-face--back" />
              <div class="dice3d-face dice3d-face--right" /><div class="dice3d-face dice3d-face--left" />
              <div class="dice3d-face dice3d-face--top" /><div class="dice3d-face dice3d-face--bottom" />
            </div>
            <div class="dice3d dice3d--bounce" :style="{ animationDelay: '0.15s' }">
              <div class="dice3d-face dice3d-face--front" /><div class="dice3d-face dice3d-face--back" />
              <div class="dice3d-face dice3d-face--right" /><div class="dice3d-face dice3d-face--left" />
              <div class="dice3d-face dice3d-face--top" /><div class="dice3d-face dice3d-face--bottom" />
            </div>
          </div>
          <p class="dice-rolling-label">🎲 掷骰子...</p>
        </template>

        <!-- 阶段2: 掷骰结果 - 点击骰子可重掷 -->
        <template v-if="phase === 'result'">
          <div class="dice-result-phase">
            <div
              class="dice-row"
              :class="{ 'dice-row--clickable': canReroll && isDealer }"
              @click="canReroll && isDealer && onReroll()"
            >
              <div class="dice3d dice3d--landed" :class="`dice3d--face${dice1}`">
                <div class="dice3d-face dice3d-face--front"><template v-for="d in getDots(dice1)" :key="d"><div class="dot" :class="`dot--${d}`" /></template></div>
                <div class="dice3d-face dice3d-face--back" /><div class="dice3d-face dice3d-face--right" />
                <div class="dice3d-face dice3d-face--left" /><div class="dice3d-face dice3d-face--top" />
                <div class="dice3d-face dice3d-face--bottom" />
              </div>
              <div class="dice3d dice3d--landed" :class="`dice3d--face${dice2}`">
                <div class="dice3d-face dice3d-face--front"><template v-for="d in getDots(dice2)" :key="d"><div class="dot" :class="`dot--${d}`" /></template></div>
                <div class="dice3d-face dice3d-face--back" /><div class="dice3d-face dice3d-face--right" />
                <div class="dice3d-face dice3d-face--left" /><div class="dice3d-face dice3d-face--top" />
                <div class="dice3d-face dice3d-face--bottom" />
              </div>
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

        <!-- 阶段3: 发牌确认按钮 -->
        <template v-if="phase === 'deal'">
          <div class="deal-phase">
            <div class="dice-row">
              <div class="dice3d dice3d--landed" :class="`dice3d--face${dice1}`">
                <div class="dice3d-face dice3d-face--front"><template v-for="d in getDots(dice1)" :key="d"><div class="dot" :class="`dot--${d}`" /></template></div>
                <div class="dice3d-face dice3d-face--back" /><div class="dice3d-face dice3d-face--right" />
                <div class="dice3d-face dice3d-face--left" /><div class="dice3d-face dice3d-face--top" />
                <div class="dice3d-face dice3d-face--bottom" />
              </div>
              <div class="dice3d dice3d--landed" :class="`dice3d--face${dice2}`">
                <div class="dice3d-face dice3d-face--front"><template v-for="d in getDots(dice2)" :key="d"><div class="dot" :class="`dot--${d}`" /></template></div>
                <div class="dice3d-face dice3d-face--back" /><div class="dice3d-face dice3d-face--right" />
                <div class="dice3d-face dice3d-face--left" /><div class="dice3d-face dice3d-face--top" />
                <div class="dice3d-face dice3d-face--bottom" />
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
  maxRolls?: number
  isDealer?: boolean
}>()

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'deal'): void
  (e: 'roll'): void
}>()

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

// 每个点数对应的dot位置
const DOT_LAYOUTS: Record<number, string[]> = {
  1: ['center'],
  2: ['tl', 'br'],
  3: ['tl', 'center', 'br'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'center', 'bl', 'br'],
  6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
}

const getDots = (n: number) => DOT_LAYOUTS[n] || ['center']

const visible = ref(true)
const isRolling = ref(false)
const phase = ref<'idle' | 'rolling' | 'result' | 'deal'>('idle')
const dice1Display = ref('🎲')
const dice2Display = ref('🎲')
const currentRoll = ref(0)
const maxRollsLimit = computed(() => props.maxRolls || 1)
const canReroll = computed(() => currentRoll.value < maxRollsLimit.value && phase.value === 'result')

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

const onRoll = () => {
  currentRoll.value++
  emit('roll')
  isRolling.value = true
  phase.value = 'rolling'

  const rollInterval = setInterval(() => {
    dice1Display.value = DICE_FACES[Math.floor(Math.random() * 6) + 1]
    dice2Display.value = DICE_FACES[Math.floor(Math.random() * 6) + 1]
  }, 70)

  setTimeout(() => {
    clearInterval(rollInterval)
    dice1Display.value = DICE_FACES[props.dice1]
    dice2Display.value = DICE_FACES[props.dice2]
    isRolling.value = false
  }, 1800)

  setTimeout(() => {
    if (visible.value) phase.value = 'result'
  }, 2200)
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

/* ===== 骰子 ===== */
/* ===== 3D骰子 ===== */
.dice-row {
  display: flex;
  gap: 48px;
  justify-content: center;
  margin-bottom: 24px;
  perspective: 600px;
}

.dice3d {
  width: 72px;
  height: 72px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
}

.dice3d-face {
  position: absolute;
  width: 72px;
  height: 72px;
  background: linear-gradient(145deg, #fefefe, #e8e0d0);
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
  display: grid;
  padding: 10px;
  box-sizing: border-box;
}

/* 面的位置 */
.dice3d-face--front  { transform: translateZ(36px); }
.dice3d-face--back   { transform: rotateY(180deg) translateZ(36px); }
.dice3d-face--right  { transform: rotateY(90deg) translateZ(36px); }
.dice3d-face--left   { transform: rotateY(-90deg) translateZ(36px); }
.dice3d-face--top    { transform: rotateX(90deg) translateZ(36px); }
.dice3d-face--bottom { transform: rotateX(-90deg) translateZ(36px); }

/* 非正面隐藏 */
.dice3d-face--back, .dice3d-face--right, .dice3d-face--left,
.dice3d-face--top, .dice3d-face--bottom {
  opacity: 0;
}

.dice3d--landed .dice3d-face--front {
  opacity: 1;
}

/* 点的样式 */
.dot {
  width: 12px;
  height: 12px;
  background: radial-gradient(circle at 40% 35%, #2a2a2a, #0a0a0a);
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3);
}

/* 点位布局 */
.dot--center { grid-area: 2/2/3/3; justify-self: center; align-self: center; }
.dot--tl     { grid-area: 1/1/2/2; justify-self: start; align-self: start; }
.dot--tr     { grid-area: 1/3/2/4; justify-self: end; align-self: start; }
.dot--ml     { grid-area: 2/1/3/2; justify-self: start; align-self: center; }
.dot--mr     { grid-area: 2/3/3/4; justify-self: end; align-self: center; }
.dot--bl     { grid-area: 3/1/4/2; justify-self: start; align-self: end; }
.dot--br     { grid-area: 3/3/4/4; justify-self: end; align-self: end; }

/* 正面用3x3 grid */
.dice3d-face--front {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
}

/* ===== 状态动画 ===== */
.dice3d--idle {
  opacity: 0.5;
  animation: idle-float 3s ease-in-out infinite;
}

@keyframes idle-float {
  0%, 100% { transform: rotateX(-15deg) rotateY(-20deg) translateY(0); }
  50% { transform: rotateX(-15deg) rotateY(-20deg) translateY(-8px); }
}

/* 可点击骰子 */
.dice-row--clickable {
  cursor: pointer;
  transition: transform 0.2s;
}
.dice-row--clickable:hover {
  transform: scale(1.05);
}

/* 掷骰弹跳+旋转动画 */
.dice3d--bounce {
  animation: dice-bounce 1.8s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}

@keyframes dice-bounce {
  0%   { transform: translateY(-200px) rotateX(0) rotateY(0) rotateZ(0); opacity: 0; }
  10%  { opacity: 1; }
  25%  { transform: translateY(0) rotateX(360deg) rotateY(180deg) rotateZ(90deg); }
  35%  { transform: translateY(-80px) rotateX(540deg) rotateY(360deg) rotateZ(180deg); }
  50%  { transform: translateY(0) rotateX(720deg) rotateY(540deg) rotateZ(270deg); }
  60%  { transform: translateY(-30px) rotateX(810deg) rotateY(630deg) rotateZ(315deg); }
  75%  { transform: translateY(0) rotateX(900deg) rotateY(720deg) rotateZ(360deg); }
  85%  { transform: translateY(-10px) rotateX(940deg) rotateY(760deg) rotateZ(380deg); }
  100% { transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
}

/* 落地 */
.dice3d--landed {
  animation: dice3d-land 0.4s ease-out;
}

@keyframes dice3d-land {
  0% { transform: scale(1.2); }
  60% { transform: scale(0.95); }
  100% { transform: scale(1); }
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

/* ===== 掷骰结果阶段 ===== */
.dice-result-phase {
  animation: result-in 0.5s ease-out;
  text-align: center;
}

.dice-roll-count {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  margin: 4px 0 16px;
}

.dice-result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}

.dice-btn {
  padding: 10px 24px;
  border-radius: 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.dice-btn--reroll {
  background: rgba(255, 193, 7, 0.15);
  color: #ffd700;
  border-color: rgba(255, 215, 0, 0.3);
}

.dice-btn--reroll:hover {
  background: rgba(255, 193, 7, 0.25);
  transform: translateY(-1px);
}

.dice-btn--proceed {
  background: linear-gradient(135deg, #1f8a52, #2eaa6a);
  color: #fff;
  border-color: rgba(70, 197, 116, 0.4);
}

.dice-btn--proceed:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(70, 197, 116, 0.3);
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
