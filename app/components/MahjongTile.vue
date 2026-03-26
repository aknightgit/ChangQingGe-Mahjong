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
      <!-- 花牌: 梅兰竹菊 -->
      <template v-else-if="tile.suit === 'hua'">
        <div class="tile-flower-top">{{ flowerEmoji }}</div>
        <div class="tile-flower-name">{{ flowerName }}</div>
      </template>
      <!-- 筒子: CSS 圆点 -->
      <template v-else-if="tile.suit === 'dots'">
        <div class="tile-dots-pattern">
          <div
            v-for="i in tile.value"
            :key="i"
            class="dot"
          />
        </div>
      </template>
      <!-- 条子: CSS 竹节 -->
      <template v-else-if="tile.suit === 'tiao'">
        <!-- 1条特殊: 麻雀 -->
        <template v-if="tile.value === 1">
          <div class="tile-bird">雀</div>
        </template>
        <template v-else>
          <div class="tile-bamboo-pattern" :class="`bamboo-count-${tile.value}`">
            <div
              v-for="i in tile.value"
              :key="i"
              class="bamboo-stick"
            />
          </div>
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

// 风牌繁体字
const windChar = computed(() => {
  const names: Record<number, string> = { 1: '東', 2: '南', 3: '西', 4: '北' }
  return names[props.tile.value] || '?'
})

// 箭牌
const dragonChar = computed(() => {
  const names: Record<number, string> = { 1: '中', 2: '發', 3: '' }
  return names[props.tile.value] || '?'
})

// 花牌
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

// 中文数字
const chineseNum = computed(() => {
  const nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  return nums[props.tile.value] || '?'
})
</script>

<style scoped>
.tile {
  width: 44px;
  height: 62px;
  border-radius: 4px;
  background: #faf6ee;
  border: 1px solid #d4c5a0;
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
}

/* ==================== 筒子 (Dots) ==================== */
.tile-dots-pattern {
  display: grid;
  gap: 2px;
  padding: 2px;
  width: 100%;
  height: 100%;
  align-content: center;
  justify-items: center;
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #ef5350, #c62828);
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 1筒: 1个居中大圆点 */
.tile--dots .tile-dots-pattern:has(.dot:nth-child(1):nth-last-child(1)) {
  grid-template-columns: 1fr;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(1):nth-last-child(1)) .dot {
  width: 24px;
  height: 24px;
}

/* 2筒: 上下2个 */
.tile--dots .tile-dots-pattern:has(.dot:nth-child(2):nth-last-child(1)) {
  grid-template-columns: 1fr;
  gap: 14px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(2):nth-last-child(1)) .dot {
  width: 18px;
  height: 18px;
}

/* 3筒: 斜排3个 */
.tile--dots .tile-dots-pattern:has(.dot:nth-child(3):nth-last-child(1)) {
  grid-template-columns: 1fr;
  gap: 3px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(3):nth-last-child(1)) .dot {
  width: 15px;
  height: 15px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(3):nth-last-child(1)) .dot:nth-child(1) {
  margin-right: 14px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(3):nth-last-child(1)) .dot:nth-child(2) {
  margin-right: 2px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(3):nth-last-child(1)) .dot:nth-child(3) {
  margin-left: 14px;
}

/* 4筒: 2x2 */
.tile--dots .tile-dots-pattern:has(.dot:nth-child(4):nth-last-child(1)) {
  grid-template-columns: 1fr 1fr;
  gap: 8px 10px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(4):nth-last-child(1)) .dot {
  width: 14px;
  height: 14px;
}

/* 5筒: 2x2 + 中心 */
.tile--dots .tile-dots-pattern:has(.dot:nth-child(5):nth-last-child(1)) {
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(5):nth-last-child(1)) .dot {
  width: 13px;
  height: 13px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(5):nth-last-child(1)) .dot:nth-child(5) {
  grid-column: 1 / -1;
  width: 12px;
  height: 12px;
}

/* 6筒: 2列x3行 */
.tile--dots .tile-dots-pattern:has(.dot:nth-child(6):nth-last-child(1)) {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(3, auto);
  gap: 5px 12px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(6):nth-last-child(1)) .dot {
  width: 12px;
  height: 12px;
}

/* 7筒: 3列 */
.tile--dots .tile-dots-pattern:has(.dot:nth-child(7):nth-last-child(1)) {
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px 5px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(7):nth-last-child(1)) .dot {
  width: 11px;
  height: 11px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(7):nth-last-child(1)) .dot:nth-child(7) {
  grid-column: 2;
}

/* 8筒: 3列 */
.tile--dots .tile-dots-pattern:has(.dot:nth-child(8):nth-last-child(1)) {
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px 5px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(8):nth-last-child(1)) .dot {
  width: 11px;
  height: 11px;
}

/* 9筒: 3x3 */
.tile--dots .tile-dots-pattern:has(.dot:nth-child(9):nth-last-child(1)) {
  grid-template-columns: 1fr 1fr 1fr;
  gap: 3px 4px;
}
.tile--dots .tile-dots-pattern:has(.dot:nth-child(9):nth-last-child(1)) .dot {
  width: 10px;
  height: 10px;
}

/* ==================== 条子 (Bamboo) ==================== */
.tile-bamboo-pattern {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 2px;
  padding: 2px;
  width: 100%;
  height: 100%;
  align-content: center;
}

.bamboo-stick {
  width: 6px;
  border-radius: 2px;
  background: linear-gradient(
    180deg,
    #66bb6a 0%,
    #2e7d32 15%,
    #66bb6a 16%,
    #2e7d32 40%,
    #66bb6a 41%,
    #2e7d32 65%,
    #66bb6a 66%,
    #2e7d32 90%,
    #43a047 100%
  );
  box-shadow: inset 1px 0 2px rgba(255, 255, 255, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Different heights for different counts */
.bamboo-count-2 .bamboo-stick { height: 22px; }
.bamboo-count-3 .bamboo-stick { height: 16px; }
.bamboo-count-4 .bamboo-stick { height: 14px; width: 5px; }
.bamboo-count-5 .bamboo-stick { height: 13px; width: 5px; }
.bamboo-count-6 .bamboo-stick { height: 12px; width: 5px; }
.bamboo-count-7 .bamboo-stick { height: 11px; width: 4px; }
.bamboo-count-8 .bamboo-stick { height: 10px; width: 4px; }
.bamboo-count-9 .bamboo-stick { height: 9px; width: 4px; }

/* 1条: 鸟 → 用文字代替emoji更清晰 */
.tile-bird {
  font-size: 1.3rem;
  line-height: 1;
  color: #2e7d32;
  font-weight: 900;
}

/* ==================== 万子 (Characters) ==================== */
.tile-char-top {
  font-size: 1.2rem;
  font-weight: 900;
  color: #1a1a1a;
  line-height: 1;
  text-shadow: 0 1px 0 rgba(0,0,0,0.08);
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
  font-size: 2.2rem;
  font-weight: 900;
  color: #1a1a1a;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
}

/* ==================== 箭牌 ==================== */
.tile-dragon {
  font-size: 2.2rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.tile-dragon--1 {
  color: #d32f2f;
  text-shadow: 0 0 6px rgba(211, 47, 47, 0.4);
}
.tile-dragon--2 {
  color: #2e7d32;
  text-shadow: 0 0 6px rgba(46, 125, 50, 0.4);
}
.tile-dragon--3 {
  /* 白板: 空心方框 */
  position: relative;
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

.tile-flower-top {
  font-size: 1rem;
  line-height: 1;
}

.tile-flower-name {
  font-size: 0.85rem;
  font-weight: 700;
  background: linear-gradient(135deg, #e91e63, #ff9800);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-top: 1px;
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

/* 牌背 - 深绿浮雕 */
.tile-back-pattern {
  width: 72%;
  height: 72%;
  border-radius: 3px;
  background:
    repeating-linear-gradient(
      45deg,
      #1a7a5a,
      #1a7a5a 3px,
      #0d5a3e 3px,
      #0d5a3e 6px
    );
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.15), inset 0 2px 4px rgba(0,0,0,0.2);
}

/* ==================== Small tile adjustments ==================== */
.tile--small .tile-dots-pattern { gap: 1px; }
.tile--small .dot { width: 8px !important; height: 8px !important; }
.tile--small .tile-dots-pattern:has(.dot:nth-child(1):nth-last-child(1)) .dot { width: 16px !important; height: 16px !important; }
.tile--small .tile-dots-pattern:has(.dot:nth-child(9):nth-last-child(1)) .dot { width: 6px !important; height: 6px !important; }
.tile--small .bamboo-stick { width: 4px !important; }
.tile--small .tile-char-top { font-size: 0.8rem; }
.tile--small .tile-char-bottom { font-size: 0.95rem; }
.tile--small .tile-wind, .tile--small .tile-dragon { font-size: 1.4rem; }
.tile--small .tile-bird { font-size: 1rem; }
.tile--small .tile-flower-top { font-size: 0.8rem; }
.tile--small .tile-flower-name { font-size: 0.7rem; }

/* ==================== 响应式 ==================== */
@media (max-width: 1300px) {
  .tile { width: 25px; height: 30px; }
  .tile--small { width: 25px; height: 30px; }
  .dot { width: 4px !important; height: 4px !important; }
  .tile-dots-pattern:has(.dot:nth-child(1):nth-last-child(1)) .dot { width: 8px !important; height: 8px !important; }
  .tile-dots-pattern:has(.dot:nth-child(2):nth-last-child(1)) .dot { width: 6px !important; height: 6px !important; }
  .tile-dots-pattern { gap: 1px !important; }
  .tile-dots-pattern:has(.dot:nth-child(4):nth-last-child(1)),
  .tile-dots-pattern:has(.dot:nth-child(5):nth-last-child(1)),
  .tile-dots-pattern:has(.dot:nth-child(6):nth-last-child(1)) { gap: 1px 3px !important; }
  .tile-dots-pattern:has(.dot:nth-child(7):nth-last-child(1)),
  .tile-dots-pattern:has(.dot:nth-child(8):nth-last-child(1)),
  .tile-dots-pattern:has(.dot:nth-child(9):nth-last-child(1)) { gap: 1px 2px !important; }
  .bamboo-stick { width: 3px !important; }
  .bamboo-count-2 .bamboo-stick { height: 10px !important; }
  .bamboo-count-3 .bamboo-stick { height: 8px !important; }
  .bamboo-count-4 .bamboo-stick,
  .bamboo-count-5 .bamboo-stick { height: 7px !important; }
  .bamboo-count-6 .bamboo-stick,
  .bamboo-count-7 .bamboo-stick,
  .bamboo-count-8 .bamboo-stick,
  .bamboo-count-9 .bamboo-stick { height: 5px !important; }
  .tile-char-top { font-size: 0.8rem; }
  .tile-char-bottom { font-size: 0.5rem; }
  .tile-wind, .tile-dragon { font-size: 0.9rem; }
  .tile-bird { font-size: 1rem; }
  .tile-flower-top { font-size: 0.7rem; }
  .tile-flower-name { font-size: 0.6rem; }
  .tile-dragon--3::after { width: 14px; height: 14px; }
}
@media (max-width: 900px) {
  .tile { width: 20px; height: 25px; }
  .tile--small { width: 20px; height: 25px; }
  .dot { width: 3px !important; height: 3px !important; }
  .tile-dots-pattern:has(.dot:nth-child(1):nth-last-child(1)) .dot { width: 6px !important; height: 6px !important; }
  .tile-dots-pattern { gap: 0px !important; }
  .bamboo-stick { width: 2px !important; }
  .bamboo-count-2 .bamboo-stick,
  .bamboo-count-3 .bamboo-stick { height: 7px !important; }
  .bamboo-count-4 .bamboo-stick,
  .bamboo-count-5 .bamboo-stick,
  .bamboo-count-6 .bamboo-stick,
  .bamboo-count-7 .bamboo-stick,
  .bamboo-count-8 .bamboo-stick,
  .bamboo-count-9 .bamboo-stick { height: 4px !important; }
  .tile-char-top { font-size: 0.6rem; }
  .tile-char-bottom { font-size: 0.4rem; }
  .tile-wind, .tile-dragon { font-size: 0.7rem; }
  .tile-bird { font-size: 0.8rem; }
  .tile-flower-top { font-size: 0.5rem; }
  .tile-flower-name { font-size: 0.45rem; }
  .tile-dragon--3::after { width: 10px; height: 10px; }
}
</style>
