<template>
  <div class="tile-wall" :class="`tile-wall--back-${effectiveBackScheme}`">
    <div class="wall-side wall-side--top">
      <div class="wall-track wall-track--horizontal wall-track--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`top-inner-${i}`" class="tile-slot">
          <BackTile :scheme="effectiveBackScheme" />
        </div>
      </div>
      <div class="wall-track wall-track--horizontal wall-track--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`top-outer-${i}`" class="tile-slot">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <div class="wall-side wall-side--bottom">
      <div class="wall-track wall-track--horizontal wall-track--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`bottom-inner-${i}`" class="tile-slot">
          <BackTile :scheme="effectiveBackScheme" />
        </div>
      </div>
      <div class="wall-track wall-track--horizontal wall-track--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`bottom-outer-${i}`" class="tile-slot">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div class="tile-side tile-side--top" />
        </div>
      </div>
    </div>

    <div class="wall-side wall-side--left">
      <div class="wall-track wall-track--vertical wall-track--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`left-inner-${i}`" class="tile-slot tile-slot--vertical">
          <BackTile :scheme="effectiveBackScheme" />
        </div>
      </div>
      <div class="wall-track wall-track--vertical wall-track--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`left-outer-${i}`" class="tile-slot tile-slot--vertical">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div class="tile-side tile-side--right" />
        </div>
      </div>
    </div>

    <div class="wall-side wall-side--right">
      <div class="wall-track wall-track--vertical wall-track--inner">
        <div v-for="i in TILES_PER_SIDE" :key="`right-inner-${i}`" class="tile-slot tile-slot--vertical">
          <BackTile :scheme="effectiveBackScheme" />
        </div>
      </div>
      <div class="wall-track wall-track--vertical wall-track--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`right-outer-${i}`" class="tile-slot tile-slot--vertical">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div class="tile-side tile-side--left" />
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
    return () => h('div', {
      class: [
        'wall-back',
        'wall-back--css',
        tileProps.outer ? 'wall-back--outer' : '',
        tileProps.scheme === 1 ? 'wall-back--ivory' : tileProps.scheme === 2 ? 'wall-back--capri' : 'wall-back--jade'
      ]
    })
  }
})

const TILES_PER_SIDE = 18
</script>

<style scoped>
.tile-wall {
  --wall-tile-w: clamp(20px, calc(var(--tile-w, 28px) * 1.0), 28px);
  --wall-tile-h: clamp(28px, var(--tile-h, 40px), 40px);
  --wall-seam-overlap: clamp(2px, calc(var(--wall-tile-w) * 0.1), 3px);
  --wall-layer-overlap: clamp(8px, calc(var(--tile-h, 40px) * 0.25), 10px);
  --wall-side-depth: clamp(2px, calc(var(--wall-tile-h) * 0.12), 4px);
  --wall-top-inset: 11%;
  --wall-bottom-inset: 11%;
  --wall-side-inset: 11%;
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.wall-side {
  position: absolute;
  display: flex;
  pointer-events: none;
  isolation: isolate;
}

.wall-side--top {
  top: var(--wall-top-inset);
  left: 50%;
  transform: translateX(-50%);
  flex-direction: column;
  align-items: center;
}

.wall-side--bottom {
  bottom: var(--wall-bottom-inset);
  left: 50%;
  transform: translateX(-50%);
  flex-direction: column-reverse;
  align-items: center;
}

.wall-side--left {
  left: var(--wall-side-inset);
  top: 50%;
  transform: translateY(-50%);
  flex-direction: row;
  align-items: center;
}

.wall-side--right {
  right: var(--wall-side-inset);
  top: 50%;
  transform: translateY(-50%);
  flex-direction: row-reverse;
  align-items: center;
}

.wall-track {
  display: flex;
  gap: 0;
}

.wall-track--inner {
  position: relative;
  z-index: 1;
}

.wall-track--outer {
  position: relative;
  z-index: 2;
}

.wall-track--horizontal {
  flex-direction: row;
}

.wall-track--vertical {
  flex-direction: column;
}

.wall-side--top .wall-track--inner,
.wall-side--bottom .wall-track--inner {
  /* inner track forms the visual outer edge of the wall */
  margin-top: 0;
}

.wall-side--top .wall-track--outer,
.wall-side--bottom .wall-track--outer {
  /* outer track shifted inward (toward center) by layer-overlap */
  margin-top: var(--wall-layer-overlap);
}

.wall-side--left .wall-track--inner {
  /* inner track shifted inward (toward center) by layer-overlap from wall edge */
  margin-left: var(--wall-layer-overlap);
}

.wall-side--left .wall-track--outer {
  /* outer track on top of inner, also shifted by layer-overlap */
  margin-left: calc(var(--wall-layer-overlap) * -1);
}

.wall-side--right .wall-track--inner {
  /* inner track shifted inward (toward center) by layer-overlap from wall edge */
  margin-right: var(--wall-layer-overlap);
}

.wall-side--right .wall-track--outer {
  /* outer track on top of inner, also shifted by layer-overlap */
  margin-right: calc(var(--wall-layer-overlap) * -1);
}

.wall-track--horizontal .tile-slot + .tile-slot {
  margin-left: calc(var(--wall-seam-overlap) * -1);
}

.wall-track--vertical .tile-slot + .tile-slot {
  margin-top: calc(var(--wall-seam-overlap) * -1);
}

.wall-side--top .wall-track--inner,
.wall-side--bottom .wall-track--inner,
.wall-side--left .wall-track--inner,
.wall-side--right .wall-track--inner {
  filter: brightness(0.92);
}

.tile-slot {
  position: relative;
  width: var(--wall-tile-w);
  height: var(--wall-tile-h);
  flex: 0 0 auto;
}

.tile-slot--vertical {
  width: var(--wall-tile-h);
  height: var(--wall-tile-w);
}

.wall-back {
  width: 100%;
  height: 100%;
  border-radius: 2px;
  box-sizing: border-box;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
}

.wall-back--css {
  --wall-back-ring-size: min(calc(var(--wall-tile-w) * 0.56), calc(var(--wall-tile-h) * 0.42));
  --wall-back-dot-size: min(calc(var(--wall-tile-w) * 0.2), calc(var(--wall-tile-h) * 0.16));
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.45);
}

.wall-back--css::before,
.wall-back--css::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  aspect-ratio: 1;
  border-radius: 50%;
  pointer-events: none;
}

.wall-back--css::before {
  width: var(--wall-back-ring-size);
  border: 1px solid currentColor;
  opacity: 0.24;
}

.wall-back--css::after {
  width: var(--wall-back-dot-size);
  background: currentColor;
  opacity: 0.34;
}

.wall-back--jade {
  color: #e0f6d4;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.22), transparent 36%),
    linear-gradient(180deg, #45d07f 0%, #239f57 100%);
  border-color: rgba(213, 245, 196, 0.22);
}

.wall-back--ivory {
  color: #8f6c2a;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.52), transparent 36%),
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
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.45)) brightness(1.05);
}

.tile-side {
  position: absolute;
  pointer-events: none;
  background: linear-gradient(180deg, #1a4a28 0%, #1a4a28 33%, #f5efe0 33%, #e8e0d0 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.tile-side--bottom,
.tile-side--top {
  left: 1px;
  right: 1px;
  height: var(--wall-side-depth);
}

.tile-side--bottom {
  bottom: calc(var(--wall-side-depth) * -1);
  border-radius: 0 0 2px 2px;
}

.tile-side--top {
  top: calc(var(--wall-side-depth) * -1);
  border-radius: 2px 2px 0 0;
  background: linear-gradient(0deg, #1a4a28 0%, #1a4a28 33%, #f5efe0 33%, #e8e0d0 100%);
}

.tile-side--left,
.tile-side--right {
  top: 1px;
  bottom: 1px;
  width: var(--wall-side-depth);
}

.tile-side--left {
  left: calc(var(--wall-side-depth) * -1);
  border-radius: 2px 0 0 2px;
  background: linear-gradient(90deg, #1a4a28 0%, #1a4a28 33%, #f5efe0 33%, #e8e0d0 100%);
}

.tile-side--right {
  right: calc(var(--wall-side-depth) * -1);
  border-radius: 0 2px 2px 0;
  background: linear-gradient(270deg, #1a4a28 0%, #1a4a28 33%, #f5efe0 33%, #e8e0d0 100%);
}

.tile-wall--back-1 .tile-side {
  background: linear-gradient(180deg, #c7a56a 0%, #c7a56a 33%, #f7efd9 33%, #e6d7b8 100%);
}

.tile-wall--back-1 .tile-side--top {
  background: linear-gradient(0deg, #c7a56a 0%, #c7a56a 33%, #f7efd9 33%, #e6d7b8 100%);
}

.tile-wall--back-1 .tile-side--left {
  background: linear-gradient(90deg, #c7a56a 0%, #c7a56a 33%, #f7efd9 33%, #e6d7b8 100%);
}

.tile-wall--back-1 .tile-side--right {
  background: linear-gradient(270deg, #c7a56a 0%, #c7a56a 33%, #f7efd9 33%, #e6d7b8 100%);
}

.tile-wall--back-2 .tile-side {
  background: linear-gradient(180deg, #057fa6 0%, #057fa6 33%, #effcff 33%, #c8eef4 100%);
}

.tile-wall--back-2 .tile-side--top {
  background: linear-gradient(0deg, #057fa6 0%, #057fa6 33%, #effcff 33%, #c8eef4 100%);
}

.tile-wall--back-2 .tile-side--left {
  background: linear-gradient(90deg, #057fa6 0%, #057fa6 33%, #effcff 33%, #c8eef4 100%);
}

.tile-wall--back-2 .tile-side--right {
  background: linear-gradient(270deg, #057fa6 0%, #057fa6 33%, #effcff 33%, #c8eef4 100%);
}
</style>
