<template>
  <Transition name="dice-fade">
    <div v-if="visible" class="dice-overlay">
      <div class="particles">
        <span v-for="n in 8" :key="n" class="particle" :style="particleStyle(n)" />
      </div>

      <div class="dice-container">
        <Transition name="quad-pop">
          <div v-if="showResultBurst" class="quad-burst">
            <span class="quad-text">{{ resultBurstLabel }}</span>
          </div>
        </Transition>

        <template v-if="phase === 'idle'">
          <div class="dice-idle-phase">
            <p class="dice-hint dice-hint--lead">
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
            <p v-if="maxRollsLimit > 1" class="dice-hint dice-hint--sub">{{ currentRoll }}/{{ maxRollsLimit }}</p>
            <button
              v-if="isDealer && maxRollsLimit <= 1"
              class="deal-button"
              @click="onRollAndDeal"
            >
              <span class="deal-icon">🎲🀫</span> 掷骰子+发牌
            </button>
            <button
              v-if="isDealer && maxRollsLimit > 1"
              class="deal-button"
              @click="onRoll"
            >
              <span class="deal-icon">🎲</span> 掷骰子 ({{ currentRoll }}/{{ maxRollsLimit }})
            </button>
            <p v-if="!isDealer" class="dice-hint dice-hint--sub">等待庄家掷骰子...</p>
          </div>
        </template>

        <template v-else-if="phase === 'rolling'">
          <div class="dice-row">
            <Dice3D :value="dice1" :state="'rolling'" :delay="0" :roll-seed="rollingSeed" />
            <Dice3D :value="dice2" :state="'rolling'" :delay="0.1" :roll-seed="rollingSeed + 97" />
          </div>
          <p class="dice-rolling-label">🎲 掷骰子...</p>
        </template>

        <template v-else>
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
              <span class="dice-total-num">{{ dice1 }}</span>
              <span class="dice-total-sep">&amp;</span>
              <span class="dice-total-num">{{ dice2 }}</span>
            </p>
            <p class="dice-hint">{{ dealerName ? `庄家: ${dealerName}` : '' }}</p>
            <p v-if="canReroll && isDealer" class="dice-hint dice-hint--sub">
              点击骰子可重掷（{{ currentRoll }}/{{ maxRollsLimit }}）
            </p>
            <button v-if="isDealer" class="deal-button deal-button--result" @click="onDeal">
              <span class="deal-icon">🀫</span> 发牌
            </button>
            <p v-if="!isDealer" class="dice-hint dice-hint--sub">等待庄家发牌...</p>
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
  /** 服务器广播的骰子结果 - 非庄家玩家通过此prop接收并自动播放动画 */
  rollTriggerKey?: number
}>()

const emit = defineEmits<{
  (e: 'deal'): void
  (e: 'roll'): void
}>()

const visible = ref(true)
const phase = ref<'idle' | 'rolling' | 'result'>('idle')
const rollingSeed = ref(Date.now() % 997)
const currentRoll = ref(0)
const showResultBurst = ref(false)
const RESULT_HOLD_MS = 500
const maxRollsLimit = computed(() => props.maxRolls || 1)
const canReroll = computed(() => currentRoll.value < maxRollsLimit.value && phase.value === 'result')
const isQuadCombo = computed(() => {
  return (props.dice1 === 1 && props.dice2 === 1) || (props.dice1 === 4 && props.dice2 === 4)
})
const isOneFourCombo = computed(() => {
  return (props.dice1 === 1 && props.dice2 === 4) || (props.dice1 === 4 && props.dice2 === 1)
})
const isDoubleCombo = computed(() => props.dice1 === props.dice2)
const resultBurstLabel = computed(() => {
  if (isQuadCombo.value) return '四倍！'
  if (isOneFourCombo.value) return '两倍！'
  if (isDoubleCombo.value) return '双倍！'
  return ''
})
const resultBurstText = computed(() => {
  if (isQuadCombo.value) return '四倍！'
  if (isDoubleCombo.value) return '双倍！'
  return ''
})

let burstTimer: ReturnType<typeof setTimeout> | null = null

const particleStyle = (_n: number) => {
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

const clearBurstTimer = () => {
  if (burstTimer) {
    clearTimeout(burstTimer)
    burstTimer = null
  }
}

const flashResultBurst = () => {
  clearBurstTimer()
  if (!resultBurstLabel.value) return
  showResultBurst.value = true
  burstTimer = setTimeout(() => {
    showResultBurst.value = false
    burstTimer = null
  }, RESULT_HOLD_MS)
}

const onRoll = () => {
  currentRoll.value++
  rollingSeed.value = Date.now() % 100000
  emit('roll')
  phase.value = 'rolling'
  showResultBurst.value = false
  clearBurstTimer()

  setTimeout(() => {
    phase.value = 'result'
    flashResultBurst()
  }, 850)
}

const onReroll = () => onRoll()

const onRollAndDeal = () => {
  currentRoll.value++
  rollingSeed.value = Date.now() % 100000
  emit('roll')
  phase.value = 'rolling'
  showResultBurst.value = false
  clearBurstTimer()

  setTimeout(() => {
    phase.value = 'result'
    flashResultBurst()
    setTimeout(() => {
      onDeal()
    }, Math.max(800, RESULT_HOLD_MS + 300))
  }, 850)
}

onMounted(() => {
  currentRoll.value = 0
  phase.value = 'idle'
})

// 监听服务器广播的骰子事件 - 自动播放动画（非庄家玩家）
watch(() => props.rollTriggerKey, (key) => {
  if (!key || key === 0) return
  currentRoll.value++
  rollingSeed.value = Date.now() % 100000
  phase.value = 'rolling'
  showResultBurst.value = false
  clearBurstTimer()
  setTimeout(() => {
    phase.value = 'result'
    flashResultBurst()
  }, 850)
})

onBeforeUnmount(() => {
  clearBurstTimer()
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
  /* backdrop-filter removed for performance */
  perspective: 1200px;
  transform-style: preserve-3d;
}

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

.dice-container {
  text-align: center;
  position: relative;
  z-index: 1;
}

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
  animation: quad-pulse 0.2s ease-out;
  letter-spacing: 0.15em;
}

@keyframes quad-pulse {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.quad-pop-enter-active {
  animation: quad-pulse 0.2s ease-out;
}

.quad-pop-leave-active {
  transition: opacity 0.18s ease;
}

.quad-pop-leave-to {
  opacity: 0;
}

.dice-row {
  display: flex;
  gap: 48px;
  justify-content: center;
  margin-bottom: 24px;
  perspective: 800px;
  perspective-origin: 50% 50%;
  transform-style: preserve-3d;
}

.dice-row--clickable {
  cursor: pointer;
  transition: transform 0.2s;
}

.dice-row--clickable:hover {
  transform: scale(1.05);
}

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

.dice-total-sep {
  margin: 0 10px;
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.82);
}

.dice-hint {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
  margin: 0;
}

.dice-hint--lead {
  font-size: 1.1rem;
  margin-bottom: 16px;
}

.dice-hint--sub {
  margin-top: 8px;
}

.dice-result-phase {
  animation: result-in 0.5s ease-out;
  text-align: center;
}

@keyframes result-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.deal-button {
  margin-top: 16px;
  padding: 16px 48px;
  border-radius: 16px;
  border: 2px solid rgba(70, 197, 116, 0.6);
  background: linear-gradient(135deg, #1f8a52, #2eaa6a);
  color: #fff;
  font-size: 1.05rem;
  font-weight: 800;
  box-shadow: 0 16px 32px rgba(18, 68, 41, 0.35);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.deal-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 36px rgba(18, 68, 41, 0.42);
}

.deal-button--result {
  margin-top: 12px;
}

.deal-icon {
  margin-right: 8px;
}

.dice-fade-enter-active,
.dice-fade-leave-active {
  transition: opacity 0.28s ease;
}

.dice-fade-enter-from,
.dice-fade-leave-to {
  opacity: 0;
}
</style>
