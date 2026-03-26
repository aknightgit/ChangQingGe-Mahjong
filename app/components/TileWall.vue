<template>
  <div class="tile-wall" :class="`tile-wall--${layout}`">
    <div
      v-for="(row, ri) in wallRows"
      :key="ri"
      class="wall-row"
      :class="`wall-row--${row.side}`"
    >
      <div
        v-for="(tile, ti) in row.tiles"
        :key="ti"
        class="wall-tile"
        :class="{ 'wall-tile--dealing': dealingIndex === ri * row.tiles.length + ti }"
      >
        <div class="wall-tile-back" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 牌墙组件 - 显示剩余牌墙
 * 四边牌墙，每边若干墩（每墩2张牌）
 */

const props = defineProps<{
  remaining: number // 剩余牌数
  layout?: 'diamond' | 'rect' // 牌墙布局风格
}>()

const layout = computed(() => props.layout || 'diamond')

const dealingIndex = ref(-1)

// 牌墙分成4边，每边固定18墩(36张)
const wallRows = computed(() => {
  const sides = ['top', 'right', 'bottom', 'left'] as const
  const pairsPerSide = 18 // 每边18墩

  return sides.map((side) => ({
    side,
    tiles: Array.from({ length: pairsPerSide }, (_, j) => j)
  }))
})
</script>

<style scoped>
.tile-wall {
  display: grid;
  grid-template-areas:
    ".    top  .   "
    "left .    right"
    ".    bottom . ";
  grid-template-columns: 1fr auto 1fr;
  grid-template-rows: auto auto auto;
  gap: 2px;
  justify-items: center;
  align-items: center;
}

.wall-row {
  display: flex;
  gap: 1px;
}

.wall-row--top {
  grid-area: top;
  flex-direction: row;
}

.wall-row--bottom {
  grid-area: bottom;
  flex-direction: row-reverse;
}

.wall-row--left {
  grid-area: left;
  flex-direction: column;
  align-items: center;
}

.wall-row--right {
  grid-area: right;
  flex-direction: column;
  align-items: center;
}

.wall-tile {
  width: 22px;
  height: 32px;
  border-radius: 3px;
  background: #faf6ee;
  border: 1px solid #c4b590;
  box-shadow: 1px 2px 0 #8a7a5a, 0 1px 3px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  position: relative;
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
  width: 75%;
  height: 75%;
  position: absolute;
  top: 12%;
  left: 12%;
  border-radius: 2px;
  background: linear-gradient(145deg, #2e8b57, #1a6b3d, #0d4a28);
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.2);
}

/* 牌墙展开时左/右边的牌也水平排列 */
.wall-row--left,
.wall-row--right {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 80px;
}
</style>
