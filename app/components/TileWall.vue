<template>
  <div class="tile-wall">
    <!-- 上边牌墙 -->
    <div class="wall-side wall-top">
      <div class="wall-layer wall-layer--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`ti-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * OVERLAP) / 2}px + ${(i - 1) * OVERLAP}px)`, top: '16%', zIndex: '1', transform: 'translateX(-50%)' }">
          <div class="tile-back" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`to-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * OVERLAP) / 2}px + ${(i - 1) * OVERLAP}px)`, top: `calc(16% + ${LAYER_OFFSET}px)`, zIndex: '2', transform: 'translateX(-50%)' }">
          <div class="tile-back tile-back--outer" />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 下边牌墙 -->
    <div class="wall-side wall-bottom">
      <div class="wall-layer wall-layer--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`bi-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * OVERLAP}px)`, bottom: '16%', zIndex: '1', transform: 'translateX(-50%)' }">
          <div class="tile-back" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`bo-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * OVERLAP}px)`, bottom: `calc(16% - ${LAYER_OFFSET}px)`, zIndex: '2', transform: 'translateX(-50%)' }">
          <div class="tile-back tile-back--outer" />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 左边牌墙 -->
    <div class="wall-side wall-left">
      <div class="wall-layer wall-layer--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`li-${i}`" class="tile-slot tile-slot--vertical"
          :style="{ top: `calc(50% - ${(TILES_PER_SIDE * V_OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * V_OVERLAP}px)`, left: '18%', zIndex: '1', transform: 'translateY(-50%)' }">
          <div class="tile-back" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`lo-${i}`" class="tile-slot tile-slot--vertical"
          :style="{ top: `calc(50% - ${(TILES_PER_SIDE * V_OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * V_OVERLAP}px)`, left: `calc(18% + ${LAYER_OFFSET}px)`, zIndex: '2', transform: 'translateY(-50%)' }">
          <div class="tile-back tile-back--outer" />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 右边牌墙 -->
    <div class="wall-side wall-right">
      <div class="wall-layer wall-layer--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`ri-${i}`" class="tile-slot tile-slot--vertical"
          :style="{ top: `calc(50% - ${(TILES_PER_SIDE * V_OVERLAP) / 2}px + ${(i - 1) * V_OVERLAP}px)`, right: '18%', zIndex: '1', transform: 'translateY(-50%)' }">
          <div class="tile-back" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`ro-${i}`" class="tile-slot tile-slot--vertical"
          :style="{ top: `calc(50% - ${(TILES_PER_SIDE * V_OVERLAP) / 2}px + ${(i - 1) * V_OVERLAP}px)`, right: `calc(18% - ${LAYER_OFFSET}px)`, zIndex: '2', transform: 'translateY(-50%)' }">
          <div class="tile-back tile-back--outer" />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  remaining: number
}>()

const TILES_PER_SIDE = 18
const OVERLAP = 28
const V_OVERLAP = 28
const LAYER_OFFSET = 5
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

/* 牌背（内层） */
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
      #1a4a28 0%, #123a1e 35%, #0a2212 65%, #040f08 100%);
  border: 0.5px solid rgba(180,220,160,0.08);
  box-shadow:
    inset 0 1px 2px rgba(255,255,255,0.1),
    inset 0 -1px 3px rgba(0,0,0,0.35);
  position: relative;
}

.tile-back::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 50%; height: 55%;
  border: 1px solid rgba(180,220,160,0.12);
  border-radius: 2px;
  background: rgba(0,0,0,0.15);
}

/* 外层牌背（更亮） */
.tile-back--outer {
  background:
    linear-gradient(180deg,
      rgba(255,255,255,0.22) 0%,
      rgba(255,255,255,0.08) 20%,
      transparent 45%,
      rgba(0,0,0,0.45) 100%),
    linear-gradient(155deg,
      #2a6435 0%, #1d5030 35%, #0e2c18 65%, #05120a 100%);
  box-shadow:
    inset 0 1px 3px rgba(255,255,255,0.18),
    inset 0 -2px 4px rgba(0,0,0,0.4),
    0 2px 6px rgba(0,0,0,0.3);
}

/* ===== 2.5D 白色侧面：全部朝下 ===== */
/* 1/3 绿色（贴牌背）+ 2/3 白色（牌面侧边） */
.tile-side {
  position: absolute;
  pointer-events: none;
  bottom: -5px;
  left: 1px;
  right: 1px;
  height: 5px;
  border-radius: 0 0 2px 2px;
  background: linear-gradient(180deg, #1a4a28 0%, #1a4a28 33%, #f5efe0 33%, #e8e0d0 100%);
  box-shadow: 0 2px 3px rgba(0,0,0,0.25);
}

/* 响应式 */
@media (max-width: 1300px) {
  .tile-slot { width: 22px; height: 32px; }
  .tile-slot--vertical { width: 32px; height: 22px; }
  .tile-side { height: 4px; bottom: -4px; }
}
@media (max-width: 900px) {
  .tile-slot { width: 16px; height: 24px; }
  .tile-slot--vertical { width: 24px; height: 16px; }
  .tile-side { height: 3px; bottom: -3px; }
  .tile-back::after { display: none; }
}
</style>
