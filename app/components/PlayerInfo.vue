<template>
  <div class="player-info" :class="[{ 'player-info--active': isActive, 'player-info--winner': isWinner }, `player-info--${position}`]">
    <span class="player-name">{{ name }}</span>
    <span v-if="isDealer" class="dealer-badge">庄</span>
    <span v-if="isWinner" class="win-badge">胡</span>
    <span class="player-score" :class="scoreClass">{{ formattedScore }}</span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string
  score?: number
  position?: 'top' | 'bottom' | 'left' | 'right'
  isActive?: boolean
  isWinner?: boolean
  isDealer?: boolean
}>()

const formattedScore = computed(() => {
  if (props.score === undefined || props.score === null) return ''
  const sign = props.score > 0 ? '+' : ''
  return `${sign}${props.score}`
})

const scoreClass = computed(() => {
  if (props.score === undefined || props.score === null) return ''
  if (props.score > 0) return 'score--positive'
  if (props.score < 0) return 'score--negative'
  return ''
})
</script>

<style scoped>
.player-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  font-size: 0.75rem;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.player-info--active {
  border-color: rgba(255, 215, 0, 0.7);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.35);
}

.player-info--winner {
  border-color: rgba(244, 67, 54, 0.7);
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.35);
}

.player-name {
  color: #f5f5f5;
  font-weight: 600;
}

.dealer-badge {
  background: #ff9800;
  color: #000;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 999px;
  line-height: 1.4;
}

.win-badge {
  background: #f44336;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 999px;
  line-height: 1.4;
}

.player-score {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  font-size: 0.7rem;
}

.score--positive {
  color: #66bb6a;
}

.score--negative {
  color: #ef5350;
}

/* Position-specific alignment */
.player-info--top {
  align-self: center;
}

.player-info--bottom {
  align-self: center;
}

.player-info--left,
.player-info--right {
  align-self: center;
}
</style>
