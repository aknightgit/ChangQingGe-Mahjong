<!--
  PlayerOtherArea - P0 重构版
  
  修复目标：
  1. 每家手牌只保留一套容器 — 不再有双轨/重复渲染
  2. 门口牌（吃碰杠）并入同一容器体系，统一裁剪
  3. 统一热调参数（方向/起点/反转/间距/裁剪开关）
  
  布局规则（从玩家视角顺时针方向，从外向内）：
    - 对家(top):   手牌在外侧 ↓  门口牌在内侧 ↓  → 整体旋转180°
    - 左家(left):  手牌在外侧 →  门口牌在内侧 →  → 牌头朝右
    - 右家(right): 手牌在外侧 ←  门口牌在内侧 ←  → 牌头朝左
  
  所有牌在同一容器内渲染，受容器裁剪约束。
-->
<template>
  <div
    class="player-other"
    :class="`player-other--${position}`"
    :style="containerStyle"
  >
    <!-- 统一容器：手牌区 + 门口牌区，共用裁剪上下文 -->
    
    <!-- ====== 对家（上方） ====== -->
    <template v-if="position === 'top'">
      <!-- 统一容器：水平排列，统一裁剪 -->
      <div class="unified-row" :style="unifiedRowStyle">
        <!-- 门口牌（内侧，靠牌桌中心） -->
        <div v-if="melds.length" class="meld-zone meld-zone--top meld-group-h">
          <div
            v-for="(m, i) in melds"
            :key="i"
            class="meld-group meld-segment"
            :class="[`meld-group--h`, `meld-group--top`, { 'meld-group--kong': m.type === 'kong' }]"
          >
            <MahjongTile
              v-for="t in m.tiles"
              :key="t.id"
              :tile="t"
              :small="true"
              :back="isConcealedMeld(m)"
              :dimmed="isWinner"
              :style="meldTileRotateStyle"
            />
          </div>
        </div>
        <!-- 手牌（外侧，远离牌桌中心 — 牌背） -->
        <div v-if="hand.length" class="hand-zone hand-zone--top hand-segment">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :dimmed="isWinner"
            :style="tileRotateStyle"
          />
        </div>
      </div>
    </template>

    <!-- ====== 左家（左侧） ====== -->
    <template v-else-if="position === 'left'">
      <!-- 统一容器：垂直排列，统一裁剪 -->
      <div class="unified-col" :style="unifiedColStyle">
        <!-- 手牌（外侧，靠牌桌边缘 — 牌背） -->
        <div v-if="hand.length" class="hand-zone hand-zone--left hand-segment">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :dimmed="isWinner"
            :style="tileRotateStyle"
          />
        </div>
        <!-- 门口牌（内侧，靠牌桌中心） -->
        <div v-if="melds.length" class="meld-zone meld-zone--left meld-group-v">
          <div
            v-for="(m, i) in melds"
            :key="i"
            class="meld-group meld-segment"
            :class="[`meld-group--v`, `meld-group--left`, { 'meld-group--kong': m.type === 'kong' }]"
          >
            <MahjongTile
              v-for="t in m.tiles"
              :key="t.id"
              :tile="t"
              :small="true"
              :back="isConcealedMeld(m)"
              :dimmed="isWinner"
              :style="meldTileRotateStyle"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ====== 右家（右侧） ====== -->
    <template v-else>
      <!-- 统一容器：垂直排列，统一裁剪 -->
      <div class="unified-col" :style="unifiedColStyle">
        <!-- 门口牌（内侧，靠牌桌中心） -->
        <div v-if="melds.length" class="meld-zone meld-zone--right meld-group-v">
          <div
            v-for="(m, i) in melds"
            :key="i"
            class="meld-group meld-segment"
            :class="[`meld-group--v`, `meld-group--right`, { 'meld-group--kong': m.type === 'kong' }]"
          >
            <MahjongTile
              v-for="t in m.tiles"
              :key="t.id"
              :tile="t"
              :small="true"
              :back="isConcealedMeld(m)"
              :dimmed="isWinner"
              :style="meldTileRotateStyle"
            />
          </div>
        </div>
        <!-- 手牌（外侧，靠牌桌边缘 — 牌背） -->
        <div v-if="hand.length" class="hand-zone hand-zone--right hand-segment">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :dimmed="isWinner"
            :style="tileRotateStyle"
          />
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import type { Meld } from '~/types/game'

const props = defineProps<{
  position: 'top' | 'left' | 'right'
  hand: any[]
  melds: Meld[]
  isWinner?: boolean
}>()

// ============================================================
// ✅ 统一方向控制 — 所有座位从 CSS 变量读取同一套参数
// 布局面板 (LayoutDebugPanel) 通过 CSS 变量注入控制
// key 映射: top → opp, left → left, right → right
// ============================================================

const seatKey = computed(() => {
  return props.position === 'top' ? 'opp' : props.position
})

/**
 * 读取单个 CSS 变量（ssr-safe）
 * @param variableName 如 '--opp-hand-direction'
 * @param fallback 默认值
 */
function cssVar(variableName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = document.documentElement.style.getPropertyValue(variableName).trim()
  return v !== '' ? v : fallback
}

/**
 * 读取数值型 CSS 变量
 */
function cssVarNum(variableName: string, fallback: number): number {
  const v = cssVar(variableName, String(fallback))
  return Number(v) || fallback
}

// ---- 容器级方向：控制手牌区/门口牌区谁在内侧/外侧 ----

// direction: 0=默认, 1=反转
const direction = computed(() => cssVarNum(`--${seatKey.value}-direction`, 0))
// start: 0=从常规端开始, 1=从远端开始
const start = computed(() => cssVarNum(`--${seatKey.value}-start`, 0))
// reverse: 最高优先级覆盖（调试面板用）
const reverse = computed(() => cssVarNum(`--${seatKey.value}-reverse`, 0))

/**
 * 计算统一的 flexDirection
 * 对家(top) 用 row/row-reverse
 * 左/右家(left/right) 用 column/column-reverse
 */
const containerFlexDirection = computed(() => {
  const key = seatKey.value
  const isRow = key === 'opp'  // 对家用 row，左/右用 column
  const baseDir = isRow ? 'row' : 'column'
  const reversedDir = isRow ? 'row-reverse' : 'column-reverse'

  // reverse 优先级最高 > start > direction
  if (reverse.value === 1) return reversedDir
  if (start.value === 1) return reversedDir
  if (direction.value === 1) return reversedDir
  return baseDir
})

// ---- 间距 ----
const handGap = computed(() => cssVarNum(`--${seatKey.value}-hand-gap`, 2))
const meldGap = computed(() => cssVarNum(`--${seatKey.value}-meld-gap`, 3))

// ---- 旋转 ----
const handRotate = computed(() => cssVarNum(`--${seatKey.value}-hand-rotate`,
  seatKey.value === 'opp' ? 180 : seatKey.value === 'left' ? 90 : -90
))
const meldRotate = computed(() => cssVarNum(`--${seatKey.value}-meld-rotate`,
  seatKey.value === 'opp' ? 180 : seatKey.value === 'left' ? 90 : -90
))

// ---- 容器尺寸 ----
const containerWidth = computed(() => {
  return props.position === 'top' ? 'var(--opp-container-w, 66%)' :
         props.position === 'left' ? 'var(--left-container-w, 85px)' :
         'var(--right-container-w, 85px)'
})

// ---- 手牌区样式 ----
const handZoneStyle = computed(() => {
  const gap = cssVarNum(`--${seatKey.value}-hand-gap`, 2)
  return {
    gap: `${gap}px`,
  }
})

// ---- 门口牌区样式 ----
const meldZoneStyle = computed(() => {
  const gap = cssVarNum(`--${seatKey.value}-meld-gap`, 3)
  return {
    gap: `${gap}px`,
  }
})

// ---- 统一容器样式 ----
const containerStyle = computed(() => ({
  position: 'relative' as const,
  flexShrink: '0' as const,
  flexGrow: '0' as const,
  overflow: 'hidden' as const,
  width: containerWidth.value,
}))

const unifiedRowStyle = computed(() => {
  if (seatKey.value !== 'opp') return {}
  return {
    display: 'flex' as const,
    flexDirection: containerFlexDirection.value,
    alignItems: 'center' as const,
    gap: `${handGap.value}px`,
    flexWrap: 'nowrap' as const,
    flexShrink: '0' as const,
    width: 'fit-content' as const,
    maxWidth: '100%',
    overflow: 'hidden' as const,
  }
})

const unifiedColStyle = computed(() => {
  if (seatKey.value === 'opp') return {}
  return {
    display: 'flex' as const,
    flexDirection: containerFlexDirection.value,
    alignItems: 'flex-start' as const,
    gap: `${handGap.value}px`,
    flexWrap: 'nowrap' as const,
    flexShrink: '0' as const,
    width: 'fit-content' as const,
    maxHeight: '100%',
    overflow: 'hidden' as const,
  }
})

// ---- tile 旋转 class ----
const tileRotateClass = computed(() => {
  if (seatKey.value === 'opp') return 'tile-rotated'
  if (seatKey.value === 'left') return 'tile-face-right'
  return 'tile-face-left'
})

const tileRotateStyle = computed(() => {
  const angle = cssVarNum(`--${seatKey.value}-hand-rotate`,
    seatKey.value === 'opp' ? 180 : seatKey.value === 'left' ? 90 : -90
  )
  return { transform: `rotate(${angle}deg)` }
})

const meldTileRotateStyle = computed(() => {
  const angle = cssVarNum(`--${seatKey.value}-meld-rotate`,
    seatKey.value === 'opp' ? 180 : seatKey.value === 'left' ? 90 : -90
  )
  return { transform: `rotate(${angle}deg)` }
})

const isConcealedMeld = (meld: Meld): boolean => {
  return meld.type === 'concealed_kong' || !!(meld as any).isConcealed
}
</script>

<style scoped>
/* ============================================================
   P0 FIX 1: 每家只保留一套容器，删除重复/备用层
   P0 FIX 2: 门口牌并入同一容器体系，统一裁剪
   ============================================================ */

/* 根容器：统一裁剪边界 */
.player-other {
  position: relative;
  flex-shrink: 0;
  flex-grow: 0;
  overflow: hidden;  /* 关键：统一裁剪，门口牌不越界 */
}

/* ============================================================
   对家（上方）：水平行
   ============================================================ */
.unified-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  flex-shrink: 0;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
}

/* 对家门口牌组（横向） */
.meld-zone--top {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--opp-meld-gap, 3px);
  flex-shrink: 0;
  overflow: hidden;
}

/* 对家手牌（横向排列） */
.hand-zone--top {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--opp-hand-gap, 2px);
  flex-shrink: 0;
  overflow: hidden;
}

/* ============================================================
   左家（左侧）：垂直列
   ============================================================ */
.unified-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-wrap: nowrap;
  flex-shrink: 0;
  width: fit-content;
  max-height: 100%;
  overflow: hidden;
}

/* 左家门口牌（竖向堆叠，整体旋转90°） */
.meld-zone--left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--left-meld-gap, 3px);
  flex-shrink: 0;
  overflow: hidden;
}

/* 左家手牌（竖向堆叠，整体旋转90° → 牌头朝右） */
.hand-zone--left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--left-hand-gap, 2px);
  flex-shrink: 0;
  overflow: hidden;
}

/* ============================================================
   右家（右侧）：垂直列
   ============================================================ */

/* 右家门口牌（竖向堆叠，整体旋转-90°） */
.meld-zone--right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--right-meld-gap, 3px);
  flex-shrink: 0;
  overflow: hidden;
}

/* 右家手牌（竖向堆叠，整体旋转-90° → 牌头朝左） */
.hand-zone--right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--right-hand-gap, 2px);
  flex-shrink: 0;
  overflow: hidden;
}

/* ============================================================
   门口牌组（通用）
   ============================================================ */
.meld-group {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  flex-wrap: nowrap;
  padding: 2px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;  /* 组内也裁剪 */
}

/* 杠牌发光效果 */
.meld-group--kong {
  box-shadow: 0 0 8px rgba(255, 214, 0, 0.4);
}

/* 横向门口牌组 */
.meld-group--h {
  flex-direction: row;
  gap: 1px;
}

/* 竖向门口牌组（用于左家/右家，组内横向排列） */
.meld-group--v {
  flex-direction: row;
  gap: 1px;
}

/* 门口牌内单牌不受额外旋转影响（由组统一控制方向） */
.meld-group :deep(.tile) {
  /* 继承组的 flex 排列 */
}

/* ============================================================
   牌方向旋转（统一热调参数）
   ============================================================ */

/* 对家：旋转180°（牌头朝下） */
.tile-rotated {
  transform: rotate(180deg);
}

/* 左家：牌头朝右 */
.tile-face-right {
  transform: rotate(90deg);
}

/* 右家：牌头朝左 */
.tile-face-left {
  transform: rotate(-90deg);
}

/* ============================================================
   热调参数生效方式：
   外部通过 CSS 变量注入：
     --opp-hand-gap, --opp-meld-gap, --opp-direction
     --left-hand-gap, --left-meld-gap, --left-direction
     --right-hand-gap, --right-meld-gap, --right-direction
   LayoutDebugPanel 已覆盖所有变量，实时生效无需刷新
   ============================================================ */
</style>
