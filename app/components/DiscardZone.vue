<template>
  <div
    class="discard-zone"
    :class="[`discard-zone--${position}`, { 'discard-zone--empty': !tiles.length }]"
    :style="zoneStyle"
  >
    <div
      v-for="(tile, index) in visibleTiles"
      :key="tile.id"
      class="discard-item"
      :class="`discard-item--${position}`"
      :style="slotStyle(index)"
    >
      <MahjongTile
        :tile="tile"
        :small="true"
        :dimmed="isWinner && tile.id !== latestTileId"
        :class="{ 'latest-tile': tile.id === latestTileId && !isWinner }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MahjongTile from './MahjongTile.vue'
import type { Tile } from '~/types/game'

const props = defineProps<{
  position: 'top' | 'bottom' | 'left' | 'right'
  tiles: Tile[]
  isWinner?: boolean
  latestTileId?: string | null
}>()

const layout = computed(() => {
  if (props.position === 'left' || props.position === 'right') {
    return { cols: 3, rows: 8, width: 126, height: 232, cellW: 42, cellH: 29 }
  }

  return { cols: 8, rows: 3, width: 232, height: 118, cellW: 29, cellH: 38 }
})

const maxTiles = computed(() => layout.value.cols * layout.value.rows)
const visibleTiles = computed(() => props.tiles.slice(0, maxTiles.value))

const zoneStyle = computed(() => ({
  width: `${layout.value.width}px`,
  height: `${layout.value.height}px`,
}))

function slotStyle(index: number) {
  const { cols, rows, cellW, cellH } = layout.value
  let col = 0
  let row = 0

  if (props.position === 'bottom') {
    col = index % cols
    row = Math.floor(index / cols)
  } else if (props.position === 'top') {
    col = cols - 1 - (index % cols)
    row = rows - 1 - Math.floor(index / cols)
  } else if (props.position === 'left') {
    col = cols - 1 - Math.floor(index / rows)
    row = index % rows
  } else {
    col = Math.floor(index / rows)
    row = rows - 1 - (index % rows)
  }

  return {
    left: `${col * cellW}px`,
    top: `${row * cellH}px`,
  }
}
</script>

<style scoped>
.discard-zone {
  position: absolute;
  z-index: 6;
  pointer-events: none;
}

.discard-zone--empty {
  opacity: 0;
}

.discard-item {
  position: absolute;
  width: 28px;
  height: 40px;
}

.discard-item--top {
  transform: rotate(180deg);
  transform-origin: center;
}

.discard-item--left {
  transform: rotate(90deg);
  transform-origin: center;
}

.discard-item--right {
  transform: rotate(-90deg);
  transform-origin: center;
}

.discard-item--bottom :deep(.tile) {
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.3), 0 -3px 0 #8a7a5a, 0 -4px 0 #6a5a3a;
}

.discard-item--top :deep(.tile) {
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.3), 0 -3px 0 #8a7a5a, 0 -4px 0 #6a5a3a;
}

.discard-item--left :deep(.tile) {
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.3), 3px 0 0 #8a7a5a, 4px 0 0 #6a5a3a;
}

.discard-item--right :deep(.tile) {
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.3), -3px 0 0 #8a7a5a, -4px 0 0 #6a5a3a;
}

.discard-item :deep(.latest-tile) {
  outline: 2px solid rgba(255, 68, 68, 0.5) !important;
  outline-offset: 3px;
  border-radius: 6px;
  box-shadow:
    0 0 8px rgba(255, 68, 68, 0.3),
    0 0 16px rgba(255, 68, 68, 0.15),
    0 0 32px rgba(255, 68, 68, 0.08);
  animation: latest-pulse 2s ease-in-out infinite;
}

@keyframes latest-pulse {
  0%, 100% {
    box-shadow:
      0 0 8px rgba(255, 68, 68, 0.3),
      0 0 16px rgba(255, 68, 68, 0.15),
      0 0 32px rgba(255, 68, 68, 0.08);
    outline-color: rgba(255, 68, 68, 0.5);
  }
  50% {
    box-shadow:
      0 0 12px rgba(255, 68, 68, 0.5),
      0 0 24px rgba(255, 68, 68, 0.25),
      0 0 48px rgba(255, 68, 68, 0.12);
    outline-color: rgba(255, 100, 100, 0.7);
  }
}
</style>
