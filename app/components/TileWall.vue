<template>
  <!--
    牌墙组件 - 双层2.5D效果（参考图）
    - 四边菱形环绕：上右下左，各18张 × 2层
    - 外层向内/外偏移，露出白色侧面产生立体感
  -->
  <div class="tile-wall">
    <!-- 上边牌墙：左→右 -->
    <div class="wall-side wall-top">
      <!-- 内层 -->
      <div class="wall-layer wall-layer--inner">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`ti-${i}`"
          class="tile-slot"
          :style="topTileStyleInner(i)"
        >
          <img
            v-if="getFace(i) !== 'back'"
            :src="`/assets/tileset/pomax_hq/${getFace(i)}.png`"
            class="tile-img"
            alt=""
          />
          <div v-else class="tile-back" />
        </div>
      </div>
      <!-- 外层：向上偏移，露出底边侧面 -->
      <div class="wall-layer wall-layer--outer wall-layer--outer-top">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`to-${i}`"
          class="tile-slot tile-slot--outer"
          :style="topTileStyleOuter(i)"
        >
          <img
            v-if="getFace(i) !== 'back'"
            :src="`/assets/tileset/pomax_hq/${getFace(i)}.png`"
            class="tile-img tile-img--outer"
            alt=""
          />
          <div v-else class="tile-back tile-back--outer" />
          <!-- 底部白色侧面（2.5D效果关键） -->
          <div class="tile-side-bottom" />
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
          :style="bottomTileStyleInner(i)"
        >
          <img
            v-if="getFaceB(i) !== 'back'"
            :src="`/assets/tileset/pomax_hq/${getFaceB(i)}.png`"
            class="tile-img"
            alt=""
          />
          <div v-else class="tile-back" />
        </div>
      </div>
      <!-- 外层：向下偏移，露出顶边侧面 -->
      <div class="wall-layer wall-layer--outer wall-layer--outer-bottom">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`bo-${i}`"
          class="tile-slot tile-slot--outer"
          :style="bottomTileStyleOuter(i)"
        >
          <img
            v-if="getFaceB(i) !== 'back'"
            :src="`/assets/tileset/pomax_hq/${getFaceB(i)}.png`"
            class="tile-img tile-img--outer"
            alt=""
          />
          <div v-else class="tile-back tile-back--outer" />
          <!-- 顶部白色侧面 -->
          <div class="tile-side-top" />
        </div>
      </div>
    </div>

    <!-- 左边牌墙：下→上 -->
    <div class="wall-side wall-left">
      <div class="wall-layer wall-layer--inner">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`li-${i}`"
          class="tile-slot tile-slot--vertical"
          :style="leftTileStyleInner(i)"
        >
          <img
            v-if="getFaceL(i) !== 'back'"
            :src="`/assets/tileset/pomax_hq/${getFaceL(i)}.png`"
            class="tile-img"
            alt=""
          />
          <div v-else class="tile-back" />
        </div>
      </div>
      <!-- 外层：向左偏移，露出右边侧面 -->
      <div class="wall-layer wall-layer--outer wall-layer--outer-left">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`lo-${i}`"
          class="tile-slot tile-slot--vertical tile-slot--outer"
          :style="leftTileStyleOuter(i)"
        >
          <img
            v-if="getFaceL(i) !== 'back'"
            :src="`/assets/tileset/pomax_hq/${getFaceL(i)}.png`"
            class="tile-img tile-img--outer"
            alt=""
          />
          <div v-else class="tile-back tile-back--outer" />
          <!-- 右侧白色侧面 -->
          <div class="tile-side-right" />
        </div>
      </div>
    </div>

    <!-- 右边牌墙：上→下 -->
    <div class="wall-side wall-right">
      <div class="wall-layer wall-layer--inner">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`ri-${i}`"
          class="tile-slot tile-slot--vertical"
          :style="rightTileStyleInner(i)"
        >
          <img
            v-if="getFaceR(i) !== 'back'"
            :src="`/assets/tileset/pomax_hq/${getFaceR(i)}.png`"
            class="tile-img"
            alt=""
          />
          <div v-else class="tile-back" />
        </div>
      </div>
      <!-- 外层：向右偏移，露出左边侧面 -->
      <div class="wall-layer wall-layer--outer wall-layer--outer-right">
        <div
          v-for="i in TILES_PER_SIDE"
          :key="`ro-${i}`"
          class="tile-slot tile-slot--vertical tile-slot--outer"
          :style="rightTileStyleOuter(i)"
        >
          <img
            v-if="getFaceR(i) !== 'back'"
            :src="`/assets/tileset/pomax_hq/${getFaceR(i)}.png`"
            class="tile-img tile-img--outer"
            alt=""
          />
          <div v-else class="tile-back tile-back--outer" />
          <!-- 左侧白色侧面 -->
          <div class="tile-side-left" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 牌墙 - 双层2.5D效果（参照参考图）
 * 四边环绕，每边18张 × 2层
 * 外层向外偏移，露出白色侧面，产生立体感
 */

const props = defineProps<{
  remaining: number
}>()

const TILES_PER_SIDE = 18

// 牌面序列（用于显示）
const FACE_SEQUENCE = [
  'Man1','Pin1','Sou1','Man2','Pin2','Sou2','Man3','Pin3','Sou3',
  'Man4','Pin4','Sou4','Man5','Pin5','Sou5','Man6','Pin6','Sou6',
  'Man7','Pin7','Sou7','Man8','Pin8','Sou8','Man9','Pin9','Sou9',
  'East','South','West','North','Chun','Pei','Haku','Hatsu','Nan',
  'Back'
]

function getFace(i: number) { return FACE_SEQUENCE[(i * 7) % (FACE_SEQUENCE.length - 1)] }
function getFaceR(i: number) { return FACE_SEQUENCE[(i * 11 + 3) % (FACE_SEQUENCE.length - 1)] }
function getFaceB(i: number) { return FACE_SEQUENCE[(i * 13 + 7) % (FACE_SEQUENCE.length - 1)] }
function getFaceL(i: number) { return FACE_SEQUENCE[(i * 17 + 11) % (FACE_SEQUENCE.length - 1)] }

// ===== 尺寸常量（参照参考图比例） =====
// 牌实际尺寸（前台使用中的大小）
const TILE_W = 28  // 牌宽(px)
const TILE_H = 40  // 牌高(px)
const OVERLAP = 22 // 相邻牌重叠像素
const LAYER_OFFSET = 5 // 外层相对内层的偏移(px)，露出侧面

// ===== 上边（水平） =====
function topTileStyleInner(i: number) {
  const totalW = TILES_PER_SIDE * OVERLAP
  return {
    left: `calc(50% - ${totalW / 2}px + ${(i - 1) * OVERLAP}px)`,
    top: '11%',
    transform: 'translateX(-50%)',
    zIndex: 1,
  }
}
function topTileStyleOuter(i: number) {
  const totalW = TILES_PER_SIDE * OVERLAP
  return {
    left: `calc(50% - ${totalW / 2}px + ${(i - 1) * OVERLAP}px)`,
    top: `calc(11% - ${LAYER_OFFSET}px)`,
    transform: 'translateX(-50%)',
    zIndex: 2,
  }
}

// ===== 下边（水平，从右往左） =====
function bottomTileStyleInner(i: number) {
  const totalW = TILES_PER_SIDE * OVERLAP
  return {
    left: `calc(50% - ${totalW / 2}px + ${(TILES_PER_SIDE - i) * OVERLAP}px)`,
    bottom: '11%',
    transform: 'translateX(-50%)',
    zIndex: 1,
  }
}
function bottomTileStyleOuter(i: number) {
  const totalW = TILES_PER_SIDE * OVERLAP
  return {
    left: `calc(50% - ${totalW / 2}px + ${(TILES_PER_SIDE - i) * OVERLAP}px)`,
    bottom: `calc(11% - ${LAYER_OFFSET}px)`,
    transform: 'translateX(-50%)',
    zIndex: 2,
  }
}

// ===== 右边（垂直，上往下） =====
function rightTileStyleInner(i: number) {
  const totalH = TILES_PER_SIDE * OVERLAP
  return {
    right: `calc(11% + ${(i - 1) * OVERLAP}px)`,
    top: `calc(50% - ${totalH / 2}px + ${(i - 1) * OVERLAP}px)`,
    transform: 'translateY(-50%)',
    zIndex: 1,
  }
}
function rightTileStyleOuter(i: number) {
  const totalH = TILES_PER_SIDE * OVERLAP
  return {
    right: `calc(11% - ${LAYER_OFFSET}px)`,
    top: `calc(50% - ${totalH / 2}px + ${(i - 1) * OVERLAP}px)`,
    transform: 'translateY(-50%)',
    zIndex: 2,
  }
}

// ===== 左边（垂直，下往上） =====
function leftTileStyleInner(i: number) {
  const totalH = TILES_PER_SIDE * OVERLAP
  return {
    left: `calc(11% + ${(TILES_PER_SIDE - i) * OVERLAP}px)`,
    top: `calc(50% - ${totalH / 2}px + ${(TILES_PER_SIDE - i) * OVERLAP}px)`,
    transform: 'translateY(-50%)',
    zIndex: 1,
  }
}
function leftTileStyleOuter(i: number) {
  const totalH = TILES_PER_SIDE * OVERLAP
  return {
    left: `calc(11% - ${LAYER_OFFSET}px)`,
    top: `calc(50% - ${totalH / 2}px + ${(TILES_PER_SIDE - i) * OVERLAP}px)`,
    transform: 'translateY(-50%)',
    zIndex: 2,
  }
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

/* ===== 单个牌slot ===== */
.tile-slot {
  position: absolute;
  width: 28px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tile-slot--vertical {
  width: 40px;
  height: 28px;
}

/* ===== 牌面图片 ===== */
.tile-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 3px;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5))
          drop-shadow(0 2px 3px rgba(0,0,0,0.3));
}

.tile-img--outer {
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6))
          drop-shadow(0 3px 5px rgba(0,0,0,0.35));
}

/* ===== 牌背 ===== */
.tile-back {
  width: 100%;
  height: 100%;
  border-radius: 3px;
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
}

.tile-back--outer {
  background:
    linear-gradient(180deg,
      rgba(255,255,255,0.18) 0%,
      rgba(255,255,255,0.06) 20%,
      transparent 45%,
      rgba(0,0,0,0.45) 100%),
    linear-gradient(155deg,
      #2a6435 0%,
      #1a4a28 35%,
      #0e2c18 65%,
      #05120a 100%);
  box-shadow:
    inset 0 1px 3px rgba(255,255,255,0.15),
    inset 0 -2px 4px rgba(0,0,0,0.4);
}

/* ===== 2.5D 白色侧面（外层专用） ===== */
.tile-side-bottom,
.tile-side-top,
.tile-side-left,
.tile-side-right {
  position: absolute;
  background: linear-gradient(180deg, #e8e0d0, #c8c0b0);
  pointer-events: none;
}

/* 上边外层：底部侧面（向下露出） */
.wall-layer--outer-top .tile-side-bottom {
  bottom: -4px;
  left: 1px;
  right: 1px;
  height: 4px;
  border-radius: 0 0 2px 2px;
  background: linear-gradient(180deg, #f0ead8, #d0c8b8);
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

/* 下边外层：顶部侧面（向上露出） */
.wall-layer--outer-bottom .tile-side-top {
  top: -4px;
  left: 1px;
  right: 1px;
  height: 4px;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(0deg, #f0ead8, #d0c8b8);
  box-shadow: 0 -1px 2px rgba(0,0,0,0.2);
}

/* 左边外层：右侧侧面（向右露出） */
.wall-layer--outer-left .tile-side-right {
  right: -4px;
  top: 1px;
  bottom: 1px;
  width: 4px;
  border-radius: 0 2px 2px 0;
  background: linear-gradient(90deg, #f0ead8, #d0c8b8);
  box-shadow: 1px 0 2px rgba(0,0,0,0.2);
}

/* 右边外层：左侧侧面（向左露出） */
.wall-layer--outer-right .tile-side-left {
  left: -4px;
  top: 1px;
  bottom: 1px;
  width: 4px;
  border-radius: 2px 0 0 2px;
  background: linear-gradient(270deg, #f0ead8, #d0c8b8);
  box-shadow: -1px 0 2px rgba(0,0,0,0.2);
}

/* ===== 俯视裁切（内层顶面轻微立体感） ===== */
.wall-layer--inner .tile-img {
  clip-path: polygon(0 6%, 100% 0, 100% 94%, 0 100%);
}

/* ===== 响应式缩放 ===== */
@media (max-width: 1300px) {
  .tile-slot { width: 22px; height: 32px; }
  .tile-slot--vertical { width: 32px; height: 22px; }
}
@media (max-width: 900px) {
  .tile-slot { width: 16px; height: 24px; }
  .tile-slot--vertical { width: 24px; height: 16px; }
}
</style>
