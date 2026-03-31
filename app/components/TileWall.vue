<template>
  <div class="tile-wall">
    <!-- 上边牌墙：上移20px -->
    <div class="wall-side wall-top">
      <div class="wall-layer wall-layer--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`ti-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * OVERLAP) / 2}px + ${(i - 1) * OVERLAP}px + 10px)`, top: 'calc(16% - 10px)', zIndex: '1', transform: 'translateX(-50%)' }">
          <img src="/assets/tileset/pomax_hq/Back.png" class="wall-back" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`to-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * OVERLAP) / 2}px + ${(i - 1) * OVERLAP}px + 10px)`, top: `calc(16% - 10px + ${LAYER_OFFSET}px)`, zIndex: '2', transform: 'translateX(-50%)' }">
          <img src="/assets/tileset/pomax_hq/Back.png" class="wall-back wall-back--outer" />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 下边牌墙（本家）：位置不变 -->
    <div class="wall-side wall-bottom">
      <div class="wall-layer wall-layer--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`bi-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * OVERLAP}px + 10px)`, bottom: 'calc(16%)', zIndex: '1', transform: 'translateX(-50%)' }">
          <img src="/assets/tileset/pomax_hq/Back.png" class="wall-back" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`bo-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * OVERLAP}px + 10px)`, bottom: `calc(16% - ${LAYER_OFFSET}px)`, zIndex: '2', transform: 'translateX(-50%)' }">
          <img src="/assets/tileset/pomax_hq/Back.png" class="wall-back wall-back--outer" />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 左边牌墙 -->
    <div class="wall-side wall-left">
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`lo-${i}`" class="tile-slot tile-slot--vertical"
          :style="{ top: `calc(50% - ${(TILES_PER_SIDE * V_OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * V_OVERLAP}px + 15px)`, left: 'calc(16%)', zIndex: '2', transform: 'translateY(-50%)' }">
          <img src="/assets/tileset/pomax_hq/Back.png" class="wall-back wall-back--outer" />
          <div v-if="i === 1" class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 右边牌墙 -->
    <div class="wall-side wall-right">
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`ro-${i}`" class="tile-slot tile-slot--vertical"
          :style="{ top: `calc(50% - ${(TILES_PER_SIDE * V_OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * V_OVERLAP}px + 15px)`, right: 'calc(16%)', zIndex: '2', transform: 'translateY(-50%)' }">
          <img src="/assets/tileset/pomax_hq/Back.png" class="wall-back wall-back--outer" />
          <div v-if="i === 1" class="tile-side tile-side--bottom" />
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
const LAYER_OFFSET = 1
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

.wall-back {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 3px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
}

.wall-back--outer {
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5)) brightness(1.1);
}

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

.tile-side--top {
  top: -5px;
  bottom: auto;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(0deg, #1a4a28 0%, #1a4a28 33%, #f5efe0 33%, #e8e0d0 100%);
  box-shadow: 0 -2px 3px rgba(0,0,0,0.25);
}

@media (max-width: 1300px) {
  .tile-slot { width: 22px; height: 32px; }
  .tile-slot--vertical { width: 32px; height: 22px; }
  .tile-side { height: 4px; bottom: -4px; }
  .tile-side--top { top: -4px; }
}
@media (max-width: 900px) {
  .tile-slot { width: 16px; height: 24px; }
  .tile-slot--vertical { width: 24px; height: 16px; }
  .tile-side { height: 3px; bottom: -3px; }
  .tile-side--top { top: -3px; }
}
</style>
