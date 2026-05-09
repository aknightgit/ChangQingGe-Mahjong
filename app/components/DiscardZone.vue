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
      <div class="discard-tile-shell" :class="`discard-tile-shell--${position}`">
        <MahjongTile
          :tile="tile"
          :small="true"
          :dimmed="isWinner && tile.id !== latestTileId"
          :class="{ 'latest-tile': tile.id === latestTileId && !isWinner }"
        />
      </div>
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
    return { cols: 3, rows: 8 }
  }

  return { cols: 10, rows: 3 }
})

const maxTiles = computed(() => layout.value.cols * layout.value.rows)
const visibleTiles = computed(() => props.tiles.slice(0, maxTiles.value))

const isSideZone = computed(() => props.position === 'left' || props.position === 'right')

const zoneStyle = computed(() => {
  const { cols, rows } = layout.value
  if (isSideZone.value) {
    return {
      width: `calc(var(--discard-step-y) * ${cols - 1} + var(--discard-tile-h))`,
      height: `calc(var(--discard-step-x) * ${rows - 1} + var(--discard-tile-w))`,
    }
  }

  return {
    width: `calc(var(--discard-step-x) * ${cols - 1} + var(--discard-tile-w))`,
    height: `calc(var(--discard-step-y) * ${rows - 1} + var(--discard-tile-h))`,
  }
})

function slotStyle(index: number) {
  const { cols, rows } = layout.value
  const stepX = isSideZone.value ? 'var(--discard-step-y)' : 'var(--discard-step-x)'
  const stepY = isSideZone.value ? 'var(--discard-step-x)' : 'var(--discard-step-y)'
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
    left: `calc(${stepX} * ${col})`,
    top: `calc(${stepY} * ${row})`,
    width: 'var(--discard-tile-w)',
    height: 'var(--discard-tile-h)',
  }
}
</script>

<style scoped>
.discard-zone {
  --discard-tile-w: calc(var(--tile-w, 28px) * 2.0);
  --discard-tile-h: calc(var(--tile-h, 40px) * 2.0);
  --discard-gap-x: clamp(0.5px, calc(var(--discard-tile-w) * 0.03), 1.5px);
  --discard-gap-y: clamp(0.5px, calc(var(--discard-tile-h) * 0.03), 1.5px);
  --discard-step-x: calc(var(--discard-tile-w) + var(--discard-gap-x));
  --discard-step-y: calc(var(--discard-tile-h) + var(--discard-gap-y));
  position: absolute;
  z-index: 6;
  pointer-events: none;
}

.discard-zone--empty {
  opacity: 0;
}

.discard-item {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.discard-tile-shell {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center;
}

.discard-tile-shell--top {
  transform: rotate(180deg);
}

.discard-tile-shell--left {
  transform: rotate(90deg);
}

.discard-tile-shell--right {
  transform: rotate(-90deg);
}

.discard-item--left,
.discard-item--right {
  transform-origin: top left;
}

.discard-tile-shell :deep(.tile) {
  width: 100% !important;
  height: 100% !important;
  box-shadow: none !important;
}

.discard-tile-shell :deep(.latest-tile) {
  border-radius: 4px;
  box-shadow:
    0 0 6px 2px rgba(255, 50, 50, 0.55),
    0 0 14px 4px rgba(255, 50, 50, 0.25);
  animation: latest-pulse 2s ease-in-out infinite;
}

@keyframes latest-pulse {
  0%, 100% {
    box-shadow:
      0 0 6px 2px rgba(255, 50, 50, 0.55),
      0 0 14px 4px rgba(255, 50, 50, 0.25);
  }
  50% {
    box-shadow:
      0 0 8px 3px rgba(255, 70, 70, 0.7),
      0 0 20px 6px rgba(255, 70, 70, 0.3);
  }
}
</style>
