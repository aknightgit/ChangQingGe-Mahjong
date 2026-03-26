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
        <div class="tile-wind">{{ windChar }}</div>
      </template>
      <!-- 箭牌: 中发白 -->
      <template v-else-if="tile.suit === 'jian'">
        <div class="tile-dragon" :class="`tile-dragon--${tile.value}`">
          {{ dragonChar }}
        </div>
      </template>
      <!-- 花牌 -->
      <template v-else-if="tile.suit === 'hua'">
        <div class="tile-flower-top">{{ flowerEmoji }}</div>
        <div class="tile-flower-name">{{ flowerName }}</div>
      </template>
      <!-- 筒子: SVG 圆点图案 -->
      <template v-else-if="tile.suit === 'dots'">
        <svg class="tile-svg" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
          <DotsPattern :value="tile.value" />
        </svg>
      </template>
      <!-- 条子: SVG 竹节图案 -->
      <template v-else-if="tile.suit === 'tiao'">
        <template v-if="tile.value === 1">
          <svg class="tile-svg" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
            <BirdPattern />
          </svg>
        </template>
        <template v-else>
          <svg class="tile-svg" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
            <BambooPattern :value="tile.value" />
          </svg>
        </template>
      </template>
      <!-- 万子: 中文数字 -->
      <template v-else>
        <div class="tile-char-top">{{ chineseNum }}</div>
        <div class="tile-char-bottom">萬</div>
      </template>
    </template>
    <template v-else>
      <div class="tile-back-pattern" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Tile } from '~/types/game'
import DotsPattern from './tile-svg/DotsPattern.vue'
import BambooPattern from './tile-svg/BambooPattern.vue'
import BirdPattern from './tile-svg/BirdPattern.vue'

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

const windChar = computed(() => {
  const names: Record<number, string> = { 1: '東', 2: '南', 3: '西', 4: '北' }
  return names[props.tile.value] || '?'
})

const dragonChar = computed(() => {
  const names: Record<number, string> = { 1: '中', 2: '發', 3: '' }
  return names[props.tile.value] || '?'
})

const flowerName = computed(() => {
  const names: Record<number, string> = {
    1: '春', 2: '夏', 3: '秋', 4: '冬',
    5: '梅', 6: '蘭', 7: '竹', 8: '菊'
  }
  return names[props.tile.value] || '?'
})

const flowerEmoji = computed(() => {
  const emojis: Record<number, string> = {
    1: '🌸', 2: '☀️', 3: '🍂', 4: '❄️',
    5: '🌸', 6: '🌿', 7: '🎋', 8: '🌼'
  }
  return emojis[props.tile.value] || '🌺'
})

const chineseNum = computed(() => {
  const nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  return nums[props.tile.value] || '?'
})
</script>

<style scoped>
.tile {
  width: 40px;
  height: 56px;
  border-radius: 4px;
  background: #faf6ee;
  border: 0.5px solid #e0d6c0;
  box-shadow: 2px 3px 0 #8a7a5a, 3px 4px 0 #6a5a3a, 0 2px 8px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 -1px;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    background 0.12s ease,
    opacity 0.12s ease,
    border-color 0.12s ease;
  font-family: 'KaiTi', 'STKaiti', 'SimSun', 'Noto Serif CJK SC', serif;
  user-select: none;
  overflow: hidden;
  position: relative;
}

.tile--small {
  width: 34px;
  height: 50px;
  border-width: 0.5px;
}

.tile-svg {
  width: 90%;
  height: 90%;
}

/* ==================== 万子 ==================== */
.tile-char-top {
  font-size: 1.5rem;
  font-weight: 900;
  color: #1a1a1a;
  line-height: 1;
}

.tile-char-bottom {
  font-size: 1.5rem;
  font-weight: 700;
  color: #c62828;
  line-height: 1;
  margin-top: 1px;
}

/* ==================== 风牌 ==================== */
.tile-wind {
  font-size: 1.8rem;
  font-weight: 900;
  color: #1a1a1a;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
}

/* ==================== 箭牌 ==================== */
.tile-dragon {
  font-size: 1.8rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.tile-dragon--1 {
  color: #c62828;
  text-shadow: 0 0 6px rgba(211, 47, 47, 0.4);
}
.tile-dragon--2 {
  color: #1b5e20;
  text-shadow: 0 0 6px rgba(46, 125, 50, 0.4);
}
.tile-dragon--3::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  border: 2px solid #1a1a1a;
  border-radius: 2px;
}

/* ==================== 花牌 ==================== */
.tile--flower {
  background: linear-gradient(135deg, #fff8e1, #ffe0b2);
  border-color: #ffb74d;
}
.tile-flower-top { font-size: 2rem; line-height: 1; }
.tile-flower-name {
  font-size: 1.7rem; font-weight: 800;
  background: linear-gradient(135deg, #e91e63, #ff9800);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  line-height: 1; margin-top: 1px;
}

/* ==================== 百搭（真实牌面 + 金色高亮） ==================== */
.tile--wild {
  border: 2px solid #ffd700 !important;
  box-shadow: 2px 3px 0 #8a7a5a, 3px 4px 0 #6a5a3a, 0 0 10px rgba(255, 215, 0, 0.5) !important;
  position: relative;
}
.tile--wild::after {
  content: '百搭';
  position: absolute;
  top: 1px;
  right: 1px;
  font-size: 0.4rem;
  color: #d4a017;
  font-weight: 700;
  line-height: 1;
  opacity: 0.8;
}

/* ==================== 交互状态 ==================== */
.tile--selected {
  transform: translateY(-6px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
}
.tile--just-drawn {
  border-color: #ffc107;
  box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.7);
}
.tile--claim {
  border-color: #ff9800;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.7);
}
.tile--dimmed {
  opacity: 0.4;
  cursor: default;
}

/* ==================== 牌背 - 绿色渐变立体 ==================== */
.tile-back-pattern {
  width: 98%;
  height: 98%;
  border-radius: 3px;
  background: linear-gradient(145deg, #2e8b57, #1a6b3d, #0d4a28);
  box-shadow: inset 0 1px 3px rgba(255,255,255,0.2), inset 0 -1px 3px rgba(0,0,0,0.3);
}

/* ==================== Small tile adjustments ==================== */
.tile--small .tile-svg { width: 85%; height: 85%; }
.tile--small .tile-char-top { font-size: 0.8rem; }
.tile--small .tile-char-bottom { font-size: 0.95rem; }
.tile--small .tile-wind, .tile--small .tile-dragon { font-size: 1.4rem; }
.tile--small .tile-flower-top { font-size: 1.2rem; }
.tile--small .tile-flower-name { font-size: 1.05rem; }

/* ==================== 响应式 ==================== */
@media (max-width: 1300px) {
  .tile { width: 28px; height: 38px; }
  .tile--small { width: 25px; height: 35px; }
  .tile-char-top { font-size: 0.8rem; }
  .tile-char-bottom { font-size: 1rem; }
  .tile-wind, .tile-dragon { font-size: 1.4rem; }
  .tile-flower-top { font-size: 1.3rem; }
  .tile-flower-name { font-size: 1.1rem; }
}
@media (max-width: 900px) {
  .tile { width: 22px; height: 30px; }
  .tile--small { width: 20px; height: 28px; }
  .tile-char-top { font-size: 0.6rem; }
  .tile-char-bottom { font-size: 0.75rem; }
  .tile-wind, .tile-dragon { font-size: 1rem; }
  .tile-flower-top { font-size: 1rem; }
  .tile-flower-name { font-size: 0.85rem; }
}
</style>
