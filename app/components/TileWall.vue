<template>
  <div class="tile-wall" :class="`tile-wall--back-${effectiveBackScheme}`">
    <!-- 上边牌墙：上移20px -->
    <div class="wall-side wall-top">
      <div class="wall-layer wall-layer--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`ti-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * BASE_OVERLAP) / 2}px + ${(i - 1) * BASE_OVERLAP}px + 10px)`, top: 'calc(16% - 10px)', zIndex: '1', transform: 'translateX(-50%)' }">
          <BackTile :scheme="effectiveBackScheme" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`to-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * BASE_OVERLAP) / 2}px + ${(i - 1) * BASE_OVERLAP}px + 10px)`, top: `calc(16% - 10px + ${LAYER_OFFSET}px)`, zIndex: '2', transform: 'translateX(-50%)' }">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 下边牌墙（本家）：位置不变 -->
    <div class="wall-side wall-bottom">
      <div class="wall-layer wall-layer--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`bi-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * BASE_OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * BASE_OVERLAP}px + 10px)`, bottom: 'calc(16%)', zIndex: '1', transform: 'translateX(-50%)' }">
          <BackTile :scheme="effectiveBackScheme" />
        </div>
      </div>
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`bo-${i}`" class="tile-slot"
          :style="{ left: `calc(50% - ${(TILES_PER_SIDE * BASE_OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * BASE_OVERLAP}px + 10px)`, bottom: `calc(16% - ${LAYER_OFFSET}px)`, zIndex: '2', transform: 'translateX(-50%)' }">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 左边牌墙 -->
    <div class="wall-side wall-left">
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`lo-${i}`" class="tile-slot tile-slot--vertical"
          :style="{ top: `calc(50% - ${(TILES_PER_SIDE * V_OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * V_OVERLAP}px + 15px)`, left: 'calc(16%)', zIndex: '2', transform: 'translateY(-50%)' }">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div v-if="i === 1" class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 右边牌墙 -->
    <div class="wall-side wall-right">
      <div class="wall-layer wall-layer--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`ro-${i}`" class="tile-slot tile-slot--vertical"
          :style="{ top: `calc(50% - ${(TILES_PER_SIDE * V_OVERLAP) / 2}px + ${(TILES_PER_SIDE - i) * V_OVERLAP}px + 15px)`, right: 'calc(16%)', zIndex: '2', transform: 'translateY(-50%)' }">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div v-if="i === 1" class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'

const props = withDefaults(defineProps<{
  remaining: number
  tileBackScheme?: number
}>(), {
  tileBackScheme: 0
})

const effectiveBackScheme = computed(() => {
  const scheme = Number(props.tileBackScheme)
  return scheme === 1 || scheme === 2 ? scheme : 0
})

const BackTile = defineComponent({
  name: 'WallBackTile',
  props: {
    scheme: { type: Number, default: 0 },
    outer: { type: Boolean, default: false }
  },
  setup(tileProps) {
    return () => {
      const baseClass = ['wall-back', tileProps.outer ? 'wall-back--outer' : '']
      return h('div', {
        class: [
          ...baseClass,
          'wall-back--css',
          tileProps.scheme === 1 ? 'wall-back--ivory' : tileProps.scheme === 2 ? 'wall-back--capri' : 'wall-back--jade'
        ]
      })
    }
  }
})

const TILES_PER_SIDE = 18
// BASE_OVERLAP: 横向(水平牌墙)每张牌占宽，tile-slot的CSS宽度
const BASE_OVERLAP = 28  // 紧贴，无间隙
const V_OVERLAP = 28  // 竖牌(垂直牌墙)每张占高，tile-slot的CSS高度
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

.wall-back--css {
  --wall-back-ring-size: 19.5px;
  --wall-back-dot-size: 7.5px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.wall-back--css::before,
.wall-back--css::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--wall-back-ring-size);
  height: auto;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: currentColor;
  opacity: 0.22;
}

.wall-back--css::after {
  width: var(--wall-back-dot-size);
  opacity: 0.35;
}

.wall-back--jade {
  color: #e0f6d4;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.24), transparent 36%),
    linear-gradient(180deg, #45d07f 0%, #239f57 100%);
  border-color: rgba(213, 245, 196, 0.22);
}

.wall-back--ivory {
  color: #8f6c2a;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.55), transparent 36%),
    linear-gradient(180deg, #f6edd8 0%, #d5b878 100%);
  border-color: rgba(120, 92, 46, 0.35);
}

.wall-back--capri {
  color: #d7fbff;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.34), transparent 34%),
    linear-gradient(180deg, #20c9df 0%, #0580a8 100%);
  border-color: rgba(5, 110, 150, 0.42);
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

.tile-wall--back-1 .tile-side {
  background: linear-gradient(180deg, #c7a56a 0%, #c7a56a 33%, #f7efd9 33%, #e6d7b8 100%);
}

.tile-wall--back-2 .tile-side {
  background: linear-gradient(180deg, #057fa6 0%, #057fa6 33%, #effcff 33%, #c8eef4 100%);
}

.tile-side--top {
  top: -5px;
  bottom: auto;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(0deg, #1a4a28 0%, #1a4a28 33%, #f5efe0 33%, #e8e0d0 100%);
  box-shadow: 0 -2px 3px rgba(0,0,0,0.25);
}

@media (max-width: 1300px) {
  .tile-slot { width: 22px; height: 22px; }
  .tile-slot--vertical { width: 22px; height: 22px; }
  .tile-side { height: 4px; bottom: -4px; }
  .tile-side--top { top: -4px; }
  .tile-side { --wall-back-ring-size: 15px; --wall-back-dot-size: 6px; }
}
@media (max-width: 900px) {
  .tile-slot { width: 14px; height: 14px; }
  .tile-slot--vertical { width: 14px; height: 14px; }
  .tile-side { height: 3px; bottom: -3px; }
  .tile-side--top { top: -3px; }
  .tile-side { --wall-back-ring-size: 10px; --wall-back-dot-size: 4px; }
}
</style>
