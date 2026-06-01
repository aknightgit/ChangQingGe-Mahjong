<template>
  <Teleport to="body">
    <div v-if="visible" class="dice-overlay">
      <div class="dice-container">
        <div class="dice-game-info">
          <div class="dice-round-label">第 {{ roundNum }} 局</div>
          <div class="dice-dealer-label">庄家: {{ dealerName }}</div>
        </div>

        <template v-if="phase === 'idle'">
          <div class="dice-row">
            <Dice3D value="1" state="idle" />
            <Dice3D value="1" state="idle" />
          </div>
          <div class="dice-hint">{{ isDealer ? '请掷骰子' : `等待 ${dealerName} 掷骰子...` }}</div>
          <div v-if="isDealer" class="dice-btn-row">
            <button class="dice-action-btn" @click="doRoll">🎲 掷骰子</button>
          </div>
        </template>

        <template v-else-if="phase === 'rolling'">
          <div class="dice-row">
            <Dice3D :value="diceValues[0]" state="rolling" :delay="0" />
            <Dice3D :value="diceValues[1]" state="rolling" :delay="0.1" />
          </div>
          <div class="dice-hint">🎲 掷骰子...</div>
        </template>

        <template v-else>
          <div class="dice-row">
            <Dice3D :value="diceValues[0]" state="landed" />
            <Dice3D :value="diceValues[1]" state="landed" />
          </div>
          <div class="dice-total">
            {{ diceValues[0] }} &amp; {{ diceValues[1] }}（共{{ diceValues[0] + diceValues[1] }}）
          </div>
          <div class="dice-hint">{{ isDealer ? '点击发牌开始游戏' : `等待 ${dealerName} 发牌...` }}</div>
          <div v-if="isDealer" class="dice-btn-row">
            <button class="dice-action-btn dice-action-btn--deal" @click="doDeal">🀫 发牌</button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Dice3D from './Dice3D.vue'

const props = defineProps<{
  visible: boolean
  diceValues: [number, number]
  dealerName: string
  isDealer: boolean
  roundNum: number
  resetTrigger?: number  // 父组件递增此值可强制重置到 idle
}>()

const emit = defineEmits<{
  (e: 'roll'): void
  (e: 'deal'): void
}>()

const phase = ref<'idle' | 'rolling' | 'result'>('idle')
const rolling = ref(false)

function doRoll() {
  if (rolling.value) return  // 防重复点击
  rolling.value = true
  phase.value = 'rolling'
  emit('roll')
  // 不再自动跳到 result — 等父组件通过 diceValues 变化触发
}

function doDeal() {
  emit('deal')
}

// 当 diceValues 从服务器拿到真实值（非初始值）时，自动进入 result 展示
watch(() => props.diceValues, (vals) => {
  if (vals[0] > 0 && vals[1] > 0) {
    // 有真实骰子值 → 延迟一小段时间让动画播放，然后展示结果
    setTimeout(() => {
      phase.value = 'result'
      rolling.value = false
    }, 500)
  }
}, { deep: true })

watch(() => props.visible, (v) => { if (v) { phase.value = 'idle'; rolling.value = false } })

// 父组件可通过递增 resetTrigger 强制回到 idle（如 API 失败）
watch(() => props.resetTrigger, () => { phase.value = 'idle'; rolling.value = false })
</script>

<style scoped>
.dice-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.95);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.dice-container { text-align: center; }
.dice-game-info { margin-bottom: 16px; }
.dice-round-label { font-size: 14px; color: #8892b0; }
.dice-dealer-label { font-size: 18px; font-weight: 700; color: #ffd700; }
.dice-row { display: flex; gap: 24px; justify-content: center; margin: 24px 0; }
.dice-total { font-size: 20px; font-weight: 700; color: #ccd6f6; margin: 12px 0; }
.dice-hint { font-size: 14px; color: #8892b0; margin: 8px 0; }
.dice-btn-row { margin-top: 20px; }
.dice-action-btn {
  padding: 12px 36px; font-size: 16px; font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white; border: none; border-radius: 12px;
  cursor: pointer; transition: transform 0.15s;
}
.dice-action-btn:active { transform: scale(0.95); }
.dice-action-btn--deal { background: linear-gradient(135deg, #48bb78, #38a169); }
</style>
