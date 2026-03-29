<template>
  <!--
    牌墙组件 - 双层2.5D效果
    - 四边环绕：上右下左，各18张 × 2层
    - 外层向外偏移，露出白色侧面产生立体感
    - 全部牌背（CSS渲染），不用图片
  -->
  <div class="tile-wall">
    <!-- 上边牌墙：左→右 -->
    <div class="wall-side wall-top">
      <div class="wall-layer wall-layer--inner">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`ti-${i}`"
          class="tile-slot"
          :style="tileStyleHorizontal(i, 'top', 'inner')"
        >
          <div class="tile-back" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`to-${i}`"
          class="tile-slot"
          :style="tileStyleHorizontal(i, 'top', 'outer')"
        >
          <div class="tile-back tile-back--outer" />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 下边牌墙：右→左 -->
    <div class="wall-side wall-bottom">
      <div class="wall-layer wall-layer--inner">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`bi-${i}`"
          class="tile-slot"
          :style="tileStyleHorizontal(i, 'bottom', 'inner')"
        >
          <div class="tile-back" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`bo-${i}`"
          class="tile-slot"
          :style="tileStyleHorizontal(i, 'bottom', 'outer')"
        >
          <div class="tile-back tile-back--outer" />
          <div class="tile-side tile-side--top" />
        </div>
      </div>
    </div>

    <!-- 左边牌墙：下→上（垂直） -->
    <div class="wall-side wall-left">
      <div class="wall-layer wall-layer--inner">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`li-${i}`"
          class="tile-slot tile-slot--vertical"
          :style="tileStyleVertical(i, 'left', 'inner')"
        >
          <div class="tile-back" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`lo-${i}`"
          class="tile-slot tile-slot--vertical"
          :style="tileStyleVertical(i, 'left', 'outer')"
        >
          <div class="tile-back tile-back--outer" />
          <div class="tile-side tile-side--right" />
        </div>
      </div>
    </div>

    <!-- 右边牌墙：上→下（垂直） -->
    <div class="wall-side wall-right">
      <div class="wall-layer wall-layer--inner">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`ri-${i}`"
          class="tile-slot tile-slot--vertical"
          :style="tileStyleVertical(i, 'right', 'inner')"
        >
          <div class="tile-back" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`ro-${i}`"
          class="tile-slot tile-slot--vertical"
          :style="tileStyleVertical(i, 'right', 'outer')"
        >
          <div class="tile-back tile-back--outer" />
          <div class="tile-side tile-side--left" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 牌墙 - 双层2.5D效果
 * 四边环绕，每边18张 × 2层
 * 外层向外偏移，露出白色侧面产生立体感
 * 全部 CSS 渲染牌背，不依赖图片
 */

defineProps<{
  remaining: number
}>()

const TILES_PER_SIDE = 18

// ===== 尺寸常量 =====
// 这些值须与 CSS 中 .tile-slot 的 width/height 一致
const TILE_W = 28   // 水平牌宽
const TILE_H = 40   // 水平牌高
const OVERLAP = 28  // 水平重叠量 = TILE_W（连续无空隙）
const V_OVERLAP = 28 // 垂直牌重叠量 = 垂直牌宽
const LAYER_OFFSET = 5 // 外层偏移量

// ===== 水平边（上/下）定位 =====
function tileStyleHorizontal(i: number, side: 'top' | 'bottom', layer: 'inner' | 'outer') {
  const totalW = TILES_PER_SIDE * OVERLAP
  const idx = side === 'bottom' ? (TILES_PER_SIDE - i) : (i - 1)
  const offset = layer === 'outer' ? LAYER_OFFSET : 0

  const pos: Record<string, string> = {
    left: `calc(50% - ${totalW / 2}px + ${idx * OVERLAP}px)`,
    zIndex: layer === 'outer' ? '2' : '1',
    transform: 'translateX(-50%)',
  }

  if (side === 'top') {
    pos.top = layer === 'outer'
      ? `calc(11% - ${offset}px)`
      : '11%'
  } else {
    pos.bottom = layer === 'outer'
      ? `calc(11% - ${offset}px)`
      : '11%'
  }

  return pos
}

// ===== 垂直边（左/右）定位 =====
function tileStyleVertical(i: number, side: 'left' | 'right', layer: 'inner' | 'outer') {
  const totalH = TILES_PER_SIDE * V_OVERLAP
  const idx = side === 'left' ? (TILES_PER_SIDE - i) : (i - 1)
  const offset = layer === 'outer' ? LAYER_OFFSET : 0

  const pos: Record<string, string> = {
    top: `calc(50% - ${totalH / 2}px + ${idx * V_OVERLAP}px)`,
    zIndex: layer === 'outer' ? '2' : '1',
    transform: 'translateY(-50%)',
  }

  if (side === 'left') {
    pos.left = layer === 'outer'
      ? `calc(11% - ${offset}px)`
      : `calc(11% + ${offset}px)`
  } else {
    pos.right = layer === 'outer'
      ? `calc(11% - ${offset}px)`
      : `calc(11% + ${offset}px)`
  }

  return pos
}
</script>

<style scoped>
.tile-wall {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.wall-side {
  position: absolute;
  inset: 0;
}

/* ===== 牌 slot ===== */
.tile-slot {
  position: absolute;
  width: 28px;
  height: 40px;
  flex-shrink: 0;
}

.tile-slot--vertical {
  width: 40px;
  height: 28px;
}

/* ===== 牌背（内层） ===== */
.tile-back {
  width: 100%;
  height: 100%;
  border-radius: 3px;
  /* 深绿渐变 + 顶部高光 */
  background:
    linear-gradient(180deg,
      rgba(255,255,255,0.15) 0%,
      rgba(255,255,255,0.04) 25%,
      transparent 50%,
      rgba(0,0,0,0.4) 100%),
    linear-gradient(155deg,
      #1a4a28 0%,
      #123a1e 35%,
      #0a2212 65%,
      #040f08 100%);
  border: 0.5px solid rgba(180,220,160,0.08);
  box-shadow:
    inset 0 1px 2px rgba(255,255,255,0.1),
    inset 0 -1px 3px rgba(0,0,0,0.35);
  position: relative;
}

/* 内层牌背装饰：中央小方框 */
.tile-back::after {
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

/* ===== 牌背（外层，更亮） ===== */
.tile-back--outer {
  background:
    linear-gradient(180deg,
      rgba(255,255,255,0.22) 0%,
      rgba(255,255,255,0.08) 20%,
      transparent 45%,
      rgba(0,0,0,0.45) 100%),
    linear-gradient(155deg,
      #2a6435 0%,
      #1d5030 35%,
      #0e2c18 65%,
      #05120a 100%);
  box-shadow:
    inset 0 1px 3px rgba(255,255,255,0.18),
    inset 0 -2px 4px rgba(0,0,0,0.4),
    0 2px 6px rgba(0,0,0,0.3);
}

/* ===== 2.5D 白色侧面 ===== */
.tile-side {
  position: absolute;
  pointer-events: none;
}

/* 上边外层 → 底部侧面（向下露出） */
.tile-side--bottom {
  bottom: -5px;
  left: 1px;
  right: 1px;
  height: 5px;
  border-radius: 0 0 2px 2px;
  background: linear-gradient(180deg, #f5efe0, #d8d0c0);
  box-shadow: 0 2px 3px rgba(0,0,0,0.25);
}

/* 下边外层 → 顶部侧面（向上露出） */
.tile-side--top {
  top: -5px;
  left: 1px;
  right: 1px;
  height: 5px;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(0deg, #f5efe0, #d8d0c0);
  box-shadow: 0 -2px 3px rgba(0,0,0,0.25);
}

/* 左边外层 → 右侧侧面（向右露出） */
.tile-side--right {
  right: -5px;
  top: 1px;
  bottom: 1px;
  width: 5px;
  border-radius: 0 2px 2px 0;
  background: linear-gradient(90deg, #f5efe0, #d8d0c0);
  box-shadow: 2px 0 3px rgba(0,0,0,0.25);
}

/* 右边外层 → 左侧侧面（向左露出） */
.tile-side--left {
  left: -5px;
  top: 1px;
  bottom: 1px;
  width: 5px;
  border-radius: 2px 0 0 2px;
  background: linear-gradient(270deg, #f5efe0, #d8d0c0);
  box-shadow: -2px 0 3px rgba(0,0,0,0.25);
}

/* ===== 响应式缩放 ===== */
@media (max-width: 1300px) {
  .tile-slot { width: 22px; height: 32px; }
  .tile-slot--vertical { width: 32px; height: 22px; }
  .tile-side--bottom,
  .tile-side--top { height: 4px; }
  .tile-side--bottom { bottom: -4px; }
  .tile-side--top { top: -4px; }
  .tile-side--left,
  .tile-side--right { width: 4px; }
  .tile-side--left { left: -4px; }
  .tile-side--right { right: -4px; }
}

@media (max-width: 900px) {
  .tile-slot { width: 16px; height: 24px; }
  .tile-slot--vertical { width: 24px; height: 16px; }
  .tile-side--bottom,
  .tile-side--top { height: 3px; }
  .tile-side--bottom { bottom: -3px; }
  .tile-side--top { top: -3px; }
  .tile-side--left,
  .tile-side--right { width: 3px; }
  .tile-side--left { left: -3px; }
  .tile-side--right { right: -3px; }
  .tile-back::after { display: none; }
}
</style>
