<template>
  <Transition name="dice-fade">
    <div v-if="visible" class="dice-overlay" @click="skip">
      <div class="dice-container">
        <div class="dice-row">
          <div class="dice" :class="{ 'dice--rolling': isRolling }">
            <span class="dice-face">{{ dice1Display }}</span>
          </div>
          <div class="dice" :class="{ 'dice--rolling': isRolling }" style="animation-delay: 0.1s">
            <span class="dice-face">{{ dice2Display }}</span>
          </div>
        </div>
        <p class="dice-label">
          {{ isRolling ? '掷骰子...' : `${dice1 + dice2} 点` }}
        </p>
        <p v-if="!isRolling" class="dice-hint">庄家: {{ dealerName }}</p>
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
}>()

const visible = ref(true)
const isRolling = ref(true)
const dice1Display = ref('🎲')
const dice2Display = ref('🎲')

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

onMounted(() => {
  // Rolling animation: rapid random faces
  const rollInterval = setInterval(() => {
    dice1Display.value = DICE_FACES[Math.floor(Math.random() * 6) + 1]
    dice2Display.value = DICE_FACES[Math.floor(Math.random() * 6) + 1]
  }, 80)

  // Show final result after 1.5s
  setTimeout(() => {
    clearInterval(rollInterval)
    dice1Display.value = DICE_FACES[props.dice1]
    dice2Display.value = DICE_FACES[props.dice2]
    isRolling.value = false
  }, 1500)

  // Auto dismiss after 3s
  setTimeout(() => {
    visible.value = false
    emit('done')
  }, 3000)
})

const skip = () => {
  visible.value = false
  emit('done')
}
</script>

<style scoped>
.dice-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(3px);
  cursor: pointer;
}

.dice-container {
  text-align: center;
}

.dice-row {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-bottom: 16px;
}

.dice {
  width: 80px;
  height: 80px;
  background: #fff;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  transition: transform 0.3s ease;
}

.dice--rolling {
  animation: shake 0.15s infinite;
}

@keyframes shake {
  0%, 100% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-8deg) scale(1.05); }
  75% { transform: rotate(8deg) scale(1.05); }
}

.dice-face {
  font-size: 3rem;
  line-height: 1;
}

.dice-label {
  color: #fff;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 8px;
}

.dice-hint {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
  margin: 0;
}

.dice-fade-enter-active,
.dice-fade-leave-active {
  transition: opacity 0.4s ease;
}

.dice-fade-enter-from,
.dice-fade-leave-to {
  opacity: 0;
}
</style>
