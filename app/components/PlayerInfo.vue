<template>
  <div class="player-info" :class="[{ 'player-info--active': isActive, 'player-info--winner': isWinner }, `player-info--${position}`]">
    <!-- 位置颜色圆圈 -->
    <span class="position-dot" :class="`dot--${positionColor}`"></span>
    <!-- Q版头像（自己不需要） -->
    <span v-if="avatar" class="avatar">{{ avatar }}</span>
    <span class="player-name">{{ name }}</span>
    <span v-if="isDealer" class="dealer-badge">庄</span>
    <span v-if="isWinner" class="win-badge">胡</span>
    <!-- 累积积分 -->
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
  avatar?: string
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

// 东=红 南=绿 西=蓝 北=黄
const positionColor = computed(() => {
  const colors: Record<string, string> = { top: 'north', bottom: 'south', left: 'west', right: 'east' }
  return colors[props.position || ''] || 'south'
})
</script>

<style scoped>
.player-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
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

/* 位置颜色圆圈 */
.position-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot--east { background: #f44336; box-shadow: 0 0 4px rgba(244,67,54,0.6); }
.dot--south { background: #4caf50; box-shadow: 0 0 4px rgba(76,175,80,0.6); }
.dot--west { background: #2196f3; box-shadow: 0 0 4px rgba(33,150,243,0.6); }
.dot--north { background: #ffc107; box-shadow: 0 0 4px rgba(255,193,7,0.6); }

/* Q版头像 */
.avatar {
  font-size: 0.9rem;
  line-height: 1;
}

.player-name {
  color: #f5f5f5;
  font-weight: 600;
}

.dealer-badge {
  background: #ff9800;
  color: #000;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 999px;
  line-height: 1.4;
}

.win-badge {
  background: #f44336;
  color: #fff;
  font-size: 0.55rem;
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
</style>
