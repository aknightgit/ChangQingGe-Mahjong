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
        :class="{ 'wall-tile--dealing': dealingIndex === row.offset + ti }"
      >
        <div class="wall-tile-back" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 牌墙组件 - 一整排连续展示
 * 剩余牌数均分四边，每边一排（不分墩/网格）
 */

const props = defineProps<{
  remaining: number
  layout?: 'diamond' | 'rect'
}>()

const layout = computed(() => props.layout || 'diamond')

const dealingIndex = ref(-1)

const wallRows = computed(() => {
  const sides = ['top', 'right', 'bottom', 'left'] as const
  const total = Math.max(0, props.remaining)
  const perSide = Math.floor(total / 4)
  const extra = total % 4 // 余数加到第一边

  let offset = 0
  return sides.map((side, i) => {
    const count = perSide + (i < extra ? 1 : 0)
    const result = {
      side,
      tiles: Array.from({ length: count }, (_, j) => j),
      offset
    }
    offset += count
    return result
  })
})
</script>

<style scoped>
.tile-wall {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.wall-row {
  position: absolute;
  display: flex;
  gap: 1px;
}

/* ===== 上下：水平一整排 ===== */
.wall-row--top {
  top: 16.5%;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row;
  flex-wrap: nowrap;
}

.wall-row--bottom {
  bottom: 16.5%;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row-reverse;
  flex-wrap: nowrap;
}

/* ===== 左右：垂直一整排 ===== */
.wall-row--left {
  left: 16.5%;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
}

.wall-row--right {
  right: 16.5%;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
}

/* ===== 单张牌墙牌：紧凑小牌 ===== */
.wall-tile {
  width: 18px;
  height: 26px;
  border-radius: 2px;
  background: #1a6b3d;
  border: 1px solid #145a32;
  box-shadow: 1px 1px 0 #0d4a28, 0 1px 2px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  transition: opacity 0.3s ease;
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
