<template>
  <div class="tile-wall" :class="`tile-wall--${layout}`">
    <div
      v-for="row in wallRows"
      :key="row.side"
      class="wall-row"
      :class="`wall-row--${row.side}`"
    >
      <div
        v-for="(tile, ti) in row.tiles"
        :key="ti"
        class="wall-tile"
        :class="{
          'wall-tile--dealing': dealingIndex === row.offset + ti,
          'wall-tile--vertical': row.side === 'left' || row.side === 'right'
        }"
      >
        <div class="wall-tile-back" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 牌墙组件 - 每边固定18剁（18组×2张=36张/边）
 * 四边连续排布，不再按 remaining 均分
 */

const props = defineProps<{
  remaining: number
  layout?: 'diamond' | 'rect'
}>()

const layout = computed(() => props.layout || 'diamond')

const dealingIndex = ref(-1)

// 每边固定18剁
const TOWERS_PER_SIDE = 18

const wallRows = computed(() => {
  const sides = ['top', 'right', 'bottom', 'left'] as const
  return sides.map((side, i) => ({
    side,
    tiles: Array.from({ length: TOWERS_PER_SIDE }, (_, j) => j),
    offset: i * TOWERS_PER_SIDE
  }))
})
</script>

<style scoped>
.tile-wall {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.wall-row {
  position: absolute;
  display: flex;
  gap: 2px;
}

/* ===== 上下：水平一整排 ===== */
.wall-row--top {
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row;
  flex-wrap: nowrap;
}

.wall-row--bottom {
  bottom: 9%;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row-reverse;
  flex-wrap: nowrap;
}

/* ===== 左右：垂直一整排 ===== */
.wall-row--left {
  left: 10%;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
}

.wall-row--right {
  right: 10%;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
}

/* ===== 单张牌墙牌 ===== */
.wall-tile {
  width: 18px;
  height: 24px;
  border-radius: 2px;
  background: #1a6b3d;
  border: 1px solid #145a32;
  box-shadow: 1px 1px 0 #0d4a28, 0 1px 2px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  transition: opacity 0.3s ease;
}

/* 左右墙的牌：立起来，竖长横短 */
.wall-tile--vertical {
  width: 16px;
  height: 26px;
}

.wall-tile--dealing {
  animation: deal-out 0.3s ease forwards;
}

@keyframes deal-out {
  to {
    opacity: 0;
    transform: scale(0.5);
  }
}

.wall-tile-back {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 1px;
  background: linear-gradient(155deg, #3da86a 0%, #2e8b57 30%, #1a6b3d 65%, #0d4a28 100%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -1px 1px rgba(0,0,0,0.2);
}
</style>
