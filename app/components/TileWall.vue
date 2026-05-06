<template>
  <div class="tile-wall" :class="`tile-wall--back-${effectiveBackScheme}`">
    <!-- 上边牌墙：两层，用 flex 横排，0 gap -->
    <div class="wall-side wall-top">
      <div class="wall-row">
        <div v-for="i in TILES_PER_SIDE" :key="`ti-${i}`" class="tile-slot">
          <BackTile :scheme="effectiveBackScheme" />
        </div>
      </div>
      <div class="wall-row wall-row--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`to-${i}`" class="tile-slot">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 下边牌墙（本家） -->
    <div class="wall-side wall-bottom">
      <div class="wall-row">
        <div v-for="i in TILES_PER_SIDE" :key="`bi-${i}`" class="tile-slot">
          <BackTile :scheme="effectiveBackScheme" />
        </div>
      </div>
      <div class="wall-row wall-row--outer">
        <div v-for="i in TILES_PER_SIDE" :key="`bo-${i}`" class="tile-slot">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 左边牌墙 -->
    <div class="wall-side wall-left">
      <div class="wall-col">
        <div v-for="i in TILES_PER_SIDE" :key="`lo-${i}`" class="tile-slot tile-slot--vertical">
          <BackTile :scheme="effectiveBackScheme" outer />
          <div v-if="i === 1" class="tile-side tile-side--bottom" />
        </div>
      </div>
    </div>

    <!-- 右边牌墙 -->
    <div class="wall-side wall-right">
      <div class="wall-col">
        <div v-for="i in TILES_PER_SIDE" :key="`ro-${i}`" class="tile-slot tile-slot--vertical">
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

/* 上下牌墙：横排 flex，0 gap，tiles 紧贴 */
.wall-top {
  top: 5%;
  left: 4%;
  right: 4%;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.wall-bottom {
  bottom: 5%;
  left: 4%;
  right: 4%;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.wall-row {
  display: flex;
  flex-direction: row;
  gap: 0;
  width: 100%;
}

.wall-row .tile-slot {
  flex: 1 1 0;
  min-width: 0;
  width: auto;
}

.wall-row--outer {
  margin-top: -3px;
}

/* 左右牌墙：竖排 flex，0 gap */
.wall-left {
  left: 4%;
  top: 5%;
  bottom: 5%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.wall-right {
  right: 4%;
  top: 5%;
  bottom: 5%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.wall-col {
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
}

.wall-col .tile-slot {
  flex: 1 1 0;
  min-height: 0;
  height: auto;
}

.tile-slot {
  position: relative;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  aspect-ratio: 5 / 7;
}

.wall-row .tile-slot {
  width: auto;
  height: 100%;
}

.wall-col .tile-slot {
  height: auto;
  width: 100%;
  aspect-ratio: 7 / 5;
}

.tile-slot--outer {
  margin-top: -3px;
}

.tile-slot--vertical {
  width: var(--tile-h, 28px);
  height: var(--tile-w, 20px);
}

.tile-slot--vertical.tile-slot--outer {
  margin-top: 0;
  margin-left: -3px;
}

.wall-back {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
}

.wall-back--css {
  --wall-back-ring-size: 14px;
  --wall-back-dot-size: 5px;
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
  bottom: -4px;
  left: 1px;
  right: 1px;
  height: 4px;
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
  top: -4px;
  bottom: auto;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(0deg, #1a4a28 0%, #1a4a28 33%, #f5efe0 33%, #e8e0d0 100%);
  box-shadow: 0 -2px 3px rgba(0,0,0,0.25);
}
</style>
