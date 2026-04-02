<template>
  <div
    class="discard-zone"
    :class="[`discard-zone--${position}`, { 'discard-zone--empty': !tiles.length }]"
  >
    <div class="discards-grid" :class="[`discards-grid--${position}`]">
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
  gap: 1px;
}

/* 左右弃牌区：每排6张 */
.discards-grid--left,
.discards-grid--right {
  grid-template-columns: repeat(6, max-content);
}

/* 左家弃牌：外层已旋转90°，内层不再旋转 */
.discard-zone--left .discards-grid {
  /* 不旋转，外层transform已处理方向 */
}

/* 右家弃牌：外层已旋转-90°，内层不再旋转 */
.discard-zone--right .discards-grid {
  /* 不旋转，外层transform已处理方向 */
}

/* 上家弃牌：旋转180°，牌面朝向牌桌中心 */
.discard-zone--top .discards-grid {
  transform: rotate(180deg);
}

/* 下家弃牌：亮红效果用outline外圈，不覆盖牌面内容 */
.discard-zone--bottom .discard-item :deep(.latest-tile) {
  outline: 3px solid #ff4444 !important;
  outline-offset: 2px;
  border-radius: 6px;
  box-shadow: 0 0 12px rgba(255, 68, 68, 0.5), 0 0 24px rgba(255, 68, 68, 0.25);
  animation: latest-glow 1.5s ease-in-out infinite;
}

/* 上家弃牌：outline外圈效果 */
.discard-zone--top .discard-item :deep(.latest-tile) {
  outline: 3px solid #ff4444 !important;
  outline-offset: 2px;
  border-radius: 6px;
  box-shadow: 0 0 12px rgba(255, 68, 68, 0.5), 0 0 24px rgba(255, 68, 68, 0.25);
  animation: latest-glow 1.5s ease-in-out infinite;
}

/* 左家弃牌：outline外圈效果 */
.discard-zone--left .discard-item :deep(.latest-tile) {
  outline: 3px solid #ff4444 !important;
  outline-offset: 2px;
  border-radius: 6px;
  box-shadow: -6px 0 12px rgba(255, 68, 68, 0.5), -12px 0 24px rgba(255, 68, 68, 0.25);
  animation: latest-glow 1.5s ease-in-out infinite;
}

/* 右家弃牌：outline外圈效果 */
.discard-zone--right .discard-item :deep(.latest-tile) {
  outline: 3px solid #ff4444 !important;
  outline-offset: 2px;
  border-radius: 6px;
  box-shadow: 6px 0 12px rgba(255, 68, 68, 0.5), 12px 0 24px rgba(255, 68, 68, 0.25);
  animation: latest-glow 1.5s ease-in-out infinite;
}

.discard-item {
  position: relative;
}

/* 最后一张弃牌小一圈 */
.discard-item:last-child :deep(.tile) {
  transform: scale(0.9);
}

/* 最新弃牌：红色outline外圈 + 亮度浮动（不覆盖牌面） */
.discard-item :deep(.latest-tile) {
  outline: 3px solid #ff4444 !important;
  outline-offset: 2px;
  border-radius: 6px;
  box-shadow: 0 0 12px rgba(255, 68, 68, 0.5), 0 0 24px rgba(255, 68, 68, 0.25);
  animation: latest-glow 1.5s ease-in-out infinite;
}

@keyframes latest-glow {
  0%, 100% {
    box-shadow: 0 0 12px rgba(255, 68, 68, 0.5), 0 0 24px rgba(255, 68, 68, 0.25);
    outline-color: #ff4444;
  }
  50% {
    box-shadow: 0 0 22px rgba(255, 68, 68, 0.8), 0 0 44px rgba(255, 68, 68, 0.4);
    outline-color: #ff6666;
  }
}
</style>
