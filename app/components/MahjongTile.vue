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
    @pointerdown="$emit('pointerdown', $event)"
    @pointerup="$emit('pointerup', $event)"
    @pointercancel="$emit('pointercancel')"
    @dragstart.prevent
  >
    <template v-if="!back">
      <!-- 风牌: 优先用 PNG，fallback 到文字 -->
      <template v-if="tile.suit === 'feng'">
        <img v-if="tileImageSrc" :src="tileImageSrc" class="tile-img" loading="lazy" />
        <div v-else class="tile-wind">{{ windChar }}</div>
      </template>
      <!-- 箭牌: 优先用 PNG，fallback 到文字 -->
      <template v-else-if="tile.suit === 'jian'">
        <img v-if="tileImageSrc" :src="tileImageSrc" class="tile-img" loading="lazy" />
        <div v-else class="tile-dragon" :class="`tile-dragon--${tile.value}`">
          {{ dragonChar }}
        </div>
      </template>
      <!-- 花牌: 优先用 PNG，fallback 到 emoji -->
      <template v-else-if="tile.suit === 'hua'">
        <img v-if="tileImageSrc" :src="tileImageSrc" class="tile-img" loading="lazy" />
        <template v-else>
          <div class="tile-flower-top">{{ flowerEmoji }}</div>
          <div class="tile-flower-name">{{ flowerName }}</div>
        </template>
      </template>
      <!-- 筒子/条子/万子: 用 PNG 牌图 -->
      <template v-else-if="tileImageSrc">
        <img :src="tileImageSrc" class="tile-img" loading="lazy" />
      </template>
      <!-- Fallback: 万子用中文数字（无图片时） -->
      <template v-else>
        <div class="tile-char-top">{{ chineseNum }}</div>
        <div class="tile-char-bottom">萬</div>
      </template>
    </template>
    <template v-else>
      <!-- 牌背：3套方案轮流使用 -->
      <div v-if="effectiveBackScheme === 0" class="tile-back-face" />
      <div v-else-if="effectiveBackScheme === 1" class="tile-back-ivory" />
      <div v-else class="tile-back-capri" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import type { Tile } from '~/types/game'

const props = withDefaults(defineProps<{
  tile: Tile
  selected?: boolean
  dimmed?: boolean
  small?: boolean
  back?: boolean
  backScheme?: number  // 0=原版, 1=象牙白, 2=卡布里蓝（-1=自动轮流）
  justDrawn?: boolean
  claimHighlight?: boolean
}>(), {
  backScheme: -1
})

const emit = defineEmits<{
  (e: 'click', tile: Tile): void
  (e: 'dblclick', tile: Tile): void
  (e: 'pointerdown', event: PointerEvent): void
  (e: 'pointerup', event: PointerEvent): void
  (e: 'pointercancel'): void
}>()

let clickTimer: ReturnType<typeof setTimeout> | null = null
let clickCount = 0

// 自动牌背方案：默认按局数轮流 (0=原版, 1=象牙白, 2=卡布里蓝)
// 父组件可通过 inject roundNumber 或手动传 backScheme
const roundNumber = inject('roundNumber', ref(1))
const effectiveBackScheme = computed(() => {
  if (props.backScheme >= 0) return props.backScheme
  return (roundNumber.value - 1) % 3  // 3套方案轮流
})

const onClick = () => {
  clickCount++
  if (clickCount === 1) {
    clickTimer = setTimeout(() => {
      clickCount = 0
      emit('click', props.tile)
    }, 250)
  } else if (clickCount === 2) {
    if (clickTimer) clearTimeout(clickTimer)
    clickCount = 0
    emit('dblclick', props.tile)
  }
}

// ===== PNG 牌图映射 =====
// 优先使用 ak_jpg 实体牌素材，fallback 到 pomax_hq
const tileImageSrc = computed(() => {
  const { suit, value } = props.tile

  // 数字牌
  if (suit === 'wan' || suit === 'man') return `/assets/tileset/ak_jpg/man${value}.jpg`
  if (suit === 'dots' || suit === 'tong') return `/assets/tileset/ak_jpg/pin${value}.jpg`
  if (suit === 'tiao') return `/assets/tileset/ak_jpg/bamboo${value}.jpg`

  // 风牌
  if (suit === 'feng') {
    const windMap: Record<number, string> = { 1: 'east', 2: 'south', 3: 'west', 4: 'north' }
    const name = windMap[value]
    return name ? `/assets/tileset/ak_jpg/${name}.jpg` : null
  }

  // 箭牌: 中发白
  if (suit === 'jian') {
    const dragonMap: Record<number, string> = { 1: 'zhong', 2: 'fa', 3: 'bai' }
    const name = dragonMap[value]
    return name ? `/assets/tileset/ak_jpg/${name}.jpg` : null
  }

  // 花牌
  if (suit === 'hua') {
    const flowerMap: Record<number, string> = {
      1: 'spring', 2: 'summer', 3: 'autumn', 4: 'winter',
      5: 'plum', 6: 'orchid', 7: 'bamboo_flower', 8: 'chrysanthemum'
    }
    const name = flowerMap[value]
    return name ? `/assets/tileset/ak_jpg/${name}.jpg` : null
  }

  return null
})

// ===== Fallback 文字渲染（保留） =====
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
  width: 28px;
  height: 40px;
  border-radius: 3px 3px 2px 2px;
  background: transparent;
  border: 0.5px solid rgba(180, 165, 130, 0.5);
  /* 2.5D: front face highlight + bottom/right side edges + ambient shadow */
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.55),
    inset -1px 0 0 rgba(0,0,0,0.06),
    inset 0 -1px 0 rgba(0,0,0,0.08),
    1px 3px 0 #8a7a5a,
    2px 5px 0 #6a5a3a,
    0 3px 10px rgba(0, 0, 0, 0.45);
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
  font-family: 'KaiTi', 'STKaiti', 'SimSun', 'Noto Serif CJK SC', serif;
  user-select: none;
  overflow: hidden;
  position: relative;
}

.tile--small {
  width: 28px;
  height: 40px;
}

/* ==================== PNG 牌图 ==================== */
.tile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 3px 3px 2px 2px;
}

/* SVG fallback 保留（兼容） */
.tile-svg {
  width: 90%;
  height: 90%;
}

/* ==================== 牌背（CSS渲染，与牌墙统一） ==================== */
.tile-back-face {
  --tile-back-ring-size: 46%;
  --tile-back-dot-size: 18%;
  --tile-back-ring-opacity: 0.3;
  --tile-back-dot-opacity: 0.42;
  width: 100%;
  height: 100%;
  border-radius: 4px 4px 3px 3px;
  background:
    linear-gradient(180deg,
      rgba(255,255,255,0.18) 0%,
      rgba(255,255,255,0.07) 25%,
      transparent 50%,
      rgba(0,0,0,0.32) 100%),
    linear-gradient(155deg,
      #2d8b57 0%,
      #247348 34%,
      #1a5d39 68%,
      #114329 100%);
  border: 0.5px solid rgba(213, 245, 196, 0.22);
  box-shadow:
    inset 0 1px 2px rgba(255,255,255,0.14),
    inset 0 -1px 3px rgba(0,0,0,0.35);
  position: relative;
  color: rgba(228, 249, 213, 0.96);
  overflow: hidden;
}
.tile-back-face::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50%;
  height: 55%;
  border: 1px solid rgba(180, 220, 160, 0.12);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.15);
}

/* ===== 方案二：象牙白/米色 ===== */
.tile-back-ivory {
  --tile-back-ring-size: 46%;
  --tile-back-dot-size: 18%;
  --tile-back-ring-opacity: 0.22;
  --tile-back-dot-opacity: 0.34;
  width: 100%;
  height: 100%;
  border-radius: 4px 4px 3px 3px;
  background:
    linear-gradient(180deg,
      rgba(255,255,255,0.3) 0%,
      rgba(255,255,255,0.1) 30%,
      transparent 55%,
      rgba(0,0,0,0.15) 100%),
    linear-gradient(155deg,
      #FFFFF0 0%,
      #F5F5DC 30%,
      #E8DCC8 60%,
      #D4C4A8 100%);
  border: 0.8px solid rgba(180, 160, 120, 0.35);
  box-shadow:
    inset 0 1px 3px rgba(255,255,255,0.5),
    inset 0 -1px 2px rgba(0,0,0,0.15),
    0 1px 3px rgba(0,0,0,0.25);
  position: relative;
}
.tile-back-ivory::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48%;
  height: 52%;
  border: 1px solid rgba(160, 140, 100, 0.25);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.04);
}

/* ===== 方案三：卡布里蓝 + 波光粼粼 ===== */
.tile-back-capri {
  --tile-back-ring-size: 46%;
  --tile-back-dot-size: 18%;
  --tile-back-ring-opacity: 0.22;
  --tile-back-dot-opacity: 0.34;
  width: 100%;
  height: 100%;
  border-radius: 4px 4px 3px 3px;
  background:
    linear-gradient(180deg,
      rgba(255,255,255,0.25) 0%,
      rgba(255,255,255,0.08) 25%,
      transparent 50%,
      rgba(0,0,40,0.3) 100%),
    linear-gradient(155deg,
      #00BFFF 0%,
      #009ACD 25%,
      #0077A8 50%,
      #005580 75%,
      #003B5C 100%);
  border: 0.8px solid rgba(100, 200, 255, 0.3);
  box-shadow:
    inset 0 1px 4px rgba(100, 220, 255, 0.35),
    inset 0 -1px 3px rgba(0,0,40,0.3),
    0 1px 3px rgba(0,0,0,0.3);
  position: relative;
  overflow: hidden;
}
/* 波光粼粼效果 */
.tile-back-capri::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.25) 0%, transparent 40%),
    radial-gradient(ellipse at 70% 60%, rgba(255,255,255,0.15) 0%, transparent 35%),
    radial-gradient(ellipse at 50% 80%, rgba(100,220,255,0.2) 0%, transparent 30%);
  animation: shimmer 3s ease-in-out infinite alternate;
  pointer-events: none;
}
.tile-back-capri::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48%;
  height: 52%;
  border: 1px solid rgba(100, 200, 255, 0.2);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.08);
}
@keyframes shimmer {
  0% { opacity: 0.6; transform: translateX(-2px) translateY(-1px); }
  50% { opacity: 1; transform: translateX(1px) translateY(1px); }
  100% { opacity: 0.7; transform: translateX(2px) translateY(-1px); }
}

/* ==================== 万子 ==================== */
.tile-back-ivory {
  color: #8f6c2a;
  overflow: hidden;
}

.tile-back-capri {
  color: #d7fbff;
}

.tile-back-face::before,
.tile-back-face::after,
.tile-back-ivory::before,
.tile-back-ivory::after,
.tile-back-capri::before,
.tile-back-capri::after {
  content: '';
  position: absolute;
  inset: auto;
  top: 50%;
  left: 50%;
  height: auto;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border: 0;
  border-radius: 50%;
  background: currentColor;
  animation: none;
  pointer-events: none;
}

.tile-back-face::before,
.tile-back-ivory::before,
.tile-back-capri::before {
  width: var(--tile-back-ring-size);
  border: 1px solid currentColor;
  background: transparent;
  opacity: var(--tile-back-ring-opacity);
}

.tile-back-face::after,
.tile-back-ivory::after,
.tile-back-capri::after {
  width: var(--tile-back-dot-size);
  background: currentColor;
  opacity: var(--tile-back-dot-opacity);
}

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

/* ==================== 牌背 ==================== */
.tile:has(.tile-img[src*="Back"]) {
  background: transparent;
}

/* ==================== Small tile adjustments ==================== */
.tile--small .tile-img { width: 100%; height: 100%; }
.tile--small .tile-svg { width: 85%; height: 85%; }
.tile--small .tile-char-top { font-size: 0.8rem; }
.tile--small .tile-char-bottom { font-size: 0.95rem; }
.tile--small .tile-wind, .tile--small .tile-dragon { font-size: 1.4rem; }
.tile--small .tile-flower-top { font-size: 1.2rem; }
.tile--small .tile-flower-name { font-size: 1.05rem; }

/* ==================== 响应式 ==================== */
@media (max-width: 1300px) {
  .tile { width: 25px; height: 34px; }
  .tile--small { width: 25px; height: 34px; }
  .tile-char-top { font-size: 0.8rem; }
  .tile-char-bottom { font-size: 1rem; }
  .tile-wind, .tile-dragon { font-size: 1.4rem; }
  .tile-flower-top { font-size: 1.3rem; }
  .tile-flower-name { font-size: 1.1rem; }
}
@media (max-width: 900px) {
  .tile { width: 20px; height: 27px; }
  .tile--small { width: 20px; height: 27px; }
  .tile-char-top { font-size: 0.6rem; }
  .tile-char-bottom { font-size: 0.75rem; }
  .tile-wind, .tile-dragon { font-size: 1rem; }
  .tile-flower-top { font-size: 1rem; }
  .tile-flower-name { font-size: 0.85rem; }
}
</style>
