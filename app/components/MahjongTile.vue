<template>
  <div
    class="tile"
    :class="[
      `tile--${tile.suit}`,
      {
        'tile--selected': selected,
        'tile--just-drawn': justDrawn,
        'tile--claim': claimHighlight,
        'tile--dimmed': dimmed,
        'tile--small': small,
        'tile--flower': tile.suit === 'hua',
        'tile--wild': tile.isWild
      }
    ]"
    @click="onClick"
  >
    <template v-if="!back">
      <!-- 风牌: 东南西北 -->
      <template v-if="tile.suit === 'feng'">
        <div class="tile-wind">{{ windName }}</div>
      </template>
      <!-- 箭牌: 中发白 -->
      <template v-else-if="tile.suit === 'jian'">
        <div class="tile-dragon" :class="`tile-dragon--${tile.value}`">
          {{ dragonName }}
        </div>
      </template>
      <!-- 花牌: 春夏秋冬梅兰竹菊 -->
      <template v-else-if="tile.suit === 'hua'">
        <div class="tile-flower">{{ flowerName }}</div>
      </template>
      <!-- 数牌: 筒万条 -->
      <template v-else>
        <div class="tile-rank">{{ tile.value }}</div>
        <div class="tile-suit">
          <span v-if="tile.suit === 'wan'">萬</span>
          <span v-else-if="tile.suit === 'dots'">筒</span>
          <span v-else>條</span>
        </div>
      </template>
    </template>
    <template v-else>
      <div class="tile-back-pattern" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Tile } from '~/types/game'

const props = defineProps<{
  tile: Tile
  selected?: boolean
  dimmed?: boolean
  small?: boolean
  back?: boolean
  justDrawn?: boolean
  claimHighlight?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', tile: Tile): void
}>()

const onClick = () => {
  emit('click', props.tile)
}

// 风牌名称
const windName = computed(() => {
  const names: Record<number, string> = { 1: '东', 2: '南', 3: '西', 4: '北' }
  return names[props.tile.value] || '?'
})

// 箭牌名称
const dragonName = computed(() => {
  const names: Record<number, string> = { 1: '中', 2: '發', 3: '白' }
  return names[props.tile.value] || '?'
})

// 花牌名称
const flowerName = computed(() => {
  const names: Record<number, string> = {
    1: '春', 2: '夏', 3: '秋', 4: '冬',
    5: '梅', 6: '蘭', 7: '竹', 8: '菊'
  }
  return names[props.tile.value] || '?'
})
</script>

<style scoped>
.tile {
  width: 40px;
  height: 60px;
  border-radius: 6px;
  background: #fdfaf3;
  border: 1px solid #e1d4b8;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 1px;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    background 0.12s ease,
    opacity 0.12s ease,
    border-color 0.12s ease;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  user-select: none;
}

.tile--small {
  width: 32px;
  height: 48px;
  font-size: 0.8rem;
}

/* 数牌样式 */
.tile-rank {
  font-size: 1rem;
  font-weight: 700;
}
.tile-suit {
  font-size: 0.85rem;
}
.tile--wan .tile-rank,
.tile--wan .tile-suit {
  color: #d32f2f;
}
.tile--dots .tile-rank,
.tile--dots .tile-suit {
  color: #1565c0;
}
.tile--tiao .tile-rank,
.tile--tiao .tile-suit {
  color: #2e7d32;
}

/* 风牌样式: 红色大字 */
.tile-wind {
  font-size: 1.3rem;
  font-weight: 900;
  color: #1a1a1a;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.1);
}

/* 箭牌样式 */
.tile-dragon {
  font-size: 1.3rem;
  font-weight: 900;
}
.tile-dragon--1 {
  /* 红中 */
  color: #d32f2f;
  text-shadow: 0 0 8px rgba(211, 47, 47, 0.4);
}
.tile-dragon--2 {
  /* 发财 - 绿色 */
  color: #2e7d32;
  text-shadow: 0 0 8px rgba(46, 125, 50, 0.4);
}
.tile-dragon--3 {
  /* 白板 - 边框显示 */
  color: transparent;
  border: 2px solid #1a1a1a;
  width: 60%;
  height: 50%;
  border-radius: 3px;
}

/* 花牌样式: 彩色 */
.tile--flower {
  background: linear-gradient(135deg, #fff8e1, #ffe0b2);
  border-color: #ffb74d;
}
.tile-flower {
  font-size: 1.2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #e91e63, #ff9800);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 百搭样式: 金色边框 */
.tile--wild {
  border: 2px solid #ffd700 !important;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.5) !important;
}

/* 选中: 上移 */
.tile--selected {
  transform: translateY(-6px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
}

/* 新摸牌: 黄色高亮 */
.tile--just-drawn {
  border-color: #ffc107;
  box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.7);
}

/* 可吃碰杠: 橙色高亮 */
.tile--claim {
  border-color: #ff9800;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.7);
}

/* 暗牌 */
.tile--dimmed {
  opacity: 0.4;
  cursor: default;
}

/* 牌背 */
.tile-back-pattern {
  width: 70%;
  height: 70%;
  border-radius: 4px;
  background: repeating-linear-gradient(
    45deg,
    #00897b,
    #00897b 4px,
    #004d40 4px,
    #004d40 8px
  );
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.2);
}

/* 响应式 */
@media (max-width: 1300px) {
  .tile { width: 25px; height: 30px; }
  .tile--small { width: 25px; height: 30px; }
  .tile-rank, .tile-suit { font-size: 0.7rem; line-height: 1; }
  .tile-wind, .tile-dragon, .tile-flower { font-size: 0.8rem; }
}
@media (max-width: 900px) {
  .tile { width: 20px; height: 25px; }
  .tile--small { width: 20px; height: 25px; }
  .tile-rank, .tile-suit { font-size: 0.5rem; }
  .tile-wind, .tile-dragon, .tile-flower { font-size: 0.6rem; }
}
</style>
