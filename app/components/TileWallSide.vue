<template>
  <div class="tile-wall-side" :class="`wall-${side}`">
    <div class="wall-layer wall-layer--outer">
      <div v-for="i in TILES_PER_SIDE" :key="`${side}-${i}`" 
           class="tile-slot tile-slot--vertical"
           :style="getTileStyle(i)">
        <img v-if="wallBackSrc" :src="wallBackSrc" class="wall-back" />
        <div v-else class="wall-back wall-back--fallback" />
        <div v-if="showSideTile(i)" class="tile-side tile-side--bottom" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getTileAssetUrl } from '~/composables/useTileAsset'

const props = defineProps<{
  remaining: number
  side: 'left' | 'right'
}>()

const TILES_PER_SIDE = 18
const V_OVERLAP = 28
const wallBackSrc = getTileAssetUrl('pomax_hq/Back.png')

function getTileStyle(index: number) {
  const offset = (TILES_PER_SIDE - index) * V_OVERLAP
  const verticalPos = `calc(50% - ${(TILES_PER_SIDE * V_OVERLAP) / 2}px + ${offset}px)`
  
  if (props.side === 'left') {
    return {
      top: verticalPos,
      left: 'calc(16%)',
      transform: 'translateY(-50%)'
    }
  } else {
    return {
      top: verticalPos,
      right: 'calc(16%)',
      transform: 'translateY(-50%)'
    }
  }
}

function showSideTile(index: number) {
  // 只在最底部显示侧边装饰
  return index === 1
}
</script>

<style scoped>
.tile-wall-side {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.tile-wall-side.wall-left {
  left: 0;
}

.tile-wall-side.wall-right {
  right: 0;
}

.tile-slot {
  position: absolute;
  width: var(--tile-h, 40px);
  height: var(--tile-w, 28px);
  flex-shrink: 0;
}

.tile-slot--vertical {
  width: var(--tile-w, 28px);
  height: var(--tile-h, 40px);
}

.wall-back {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 3px;
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5)) brightness(1.1);
}

.wall-back--fallback {
  background: linear-gradient(180deg, #3e9b57 0%, #256f39 100%);
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.18), inset 0 -1px 2px rgba(0,0,0,0.28);
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

@media (max-width: 1300px) {
  .tile-side { height: 4px; bottom: -4px; }
}
@media (max-width: 900px) {
  .tile-side { height: 3px; bottom: -3px; }
}
</style>
