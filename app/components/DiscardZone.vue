<template>
  <div
    class="discard-zone"
    :class="[`discard-zone--${position}`, { 'discard-zone--empty': !tiles.length }]"
  >
    <div class="discards-grid">
      <div
        v-for="tile in tiles"
        :key="tile.id"
        class="discard-item"
      >
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
import MahjongTile from './MahjongTile.vue'
import type { Tile } from '~/types/game'

const props = defineProps<{
  position: 'top' | 'bottom' | 'left' | 'right'
  tiles: Tile[]
  isWinner?: boolean
  latestTileId?: string | null
}>()
</script>

<style scoped>
.discard-zone {
  position: absolute;
  z-index: 5;
}

/* 空区域不占位 */
.discard-zone--empty {
  pointer-events: none;
}

.discards-grid {
  display: grid;
  grid-template-columns: repeat(8, max-content);
  gap: 2px;
}

/* 左家弃牌：旋转180°，让2.5D阴影方向从视觉上正确（阴影指向上方=靠近牌桌中心） */
.discard-zone--left .discards-grid {
  transform: rotate(180deg);
}

/* 右家弃牌：旋转180°，让2.5D阴影方向从视觉上正确 */
.discard-zone--right .discards-grid {
  transform: rotate(180deg);
}

/* 上家弃牌：已旋转180°（通过 position: top + translateX(-50%)），额外翻转让牌面正向显示 */
.discard-zone--top .discards-grid {
  transform: rotate(180deg);
}

.discard-item {
  position: relative;
}

/* 最新弃牌：红色外框 + 亮度浮动 */
.discard-item :deep(.latest-tile) {
  border: 2px solid #ff4444 !important;
  border-radius: 6px;
  box-shadow: 0 0 8px rgba(255, 68, 68, 0.6), 0 0 16px rgba(255, 68, 68, 0.3);
  animation: latest-glow 1.5s ease-in-out infinite;
}

@keyframes latest-glow {
  0%, 100% {
    box-shadow: 0 0 8px rgba(255, 68, 68, 0.6), 0 0 16px rgba(255, 68, 68, 0.3);
    border-color: #ff4444;
  }
  50% {
    box-shadow: 0 0 14px rgba(255, 68, 68, 0.9), 0 0 28px rgba(255, 68, 68, 0.5);
    border-color: #ff6666;
  }
}
</style>
