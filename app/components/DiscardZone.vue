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

/* 左家弃牌：外层已旋转90°，内层不再旋转 */
.discard-zone--left .discards-grid {
  /* 不旋转，外层transform已处理方向 */
}

/* 右家弃牌：外层已旋转-90°，内层不再旋转 */
.discard-zone--right .discards-grid {
  /* 不旋转，外层transform已处理方向 */
}

/* 上家弃牌：已旋转180°（通过 position: top + translateX(-50%)），额外翻转让牌面正向显示 */
.discard-zone--top .discards-grid {
  transform: rotate(180deg);
}

/* 下家弃牌：亮红效果直接打在 tile 上（无旋转干扰） */
.discard-zone--bottom .discard-item :deep(.latest-tile) {
  border: 4px solid #ff4444 !important;
  border-radius: 6px;
  box-shadow: 0 0 16px rgba(255, 68, 68, 0.6), 0 0 32px rgba(255, 68, 68, 0.3);
  animation: latest-glow 1.5s ease-in-out infinite;
}

/* 上家弃牌：先应用外层180°旋转，glow效果也需要同步翻转（打在tile上时等效于box-shadow方向翻转） */
.discard-zone--top .discard-item :deep(.latest-tile) {
  border: 4px solid #ff4444 !important;
  border-radius: 6px;
  box-shadow: 0 0 16px rgba(255, 68, 68, 0.6), 0 0 32px rgba(255, 68, 68, 0.3);
  animation: latest-glow 1.5s ease-in-out infinite;
}

/* 左家弃牌：grid旋转180°后，glow打在tile上时视觉上等效于盒内阴影从左指向右；等效于 box-shadow X轴偏移取反 */
.discard-zone--left .discard-item :deep(.latest-tile) {
  border: 4px solid #ff4444 !important;
  border-radius: 6px;
  box-shadow: -8px 0 16px rgba(255, 68, 68, 0.6), -16px 0 32px rgba(255, 68, 68, 0.3);
  animation: latest-glow 1.5s ease-in-out infinite;
}

/* 右家弃牌：grid旋转180°后，glow打在tile上时视觉上等效于盒内阴影从右指向左；等效于 box-shadow X轴偏移取反 */
.discard-zone--right .discard-item :deep(.latest-tile) {
  border: 4px solid #ff4444 !important;
  border-radius: 6px;
  box-shadow: 8px 0 16px rgba(255, 68, 68, 0.6), 16px 0 32px rgba(255, 68, 68, 0.3);
  animation: latest-glow 1.5s ease-in-out infinite;
}

.discard-item {
  position: relative;
}

/* 最新弃牌：红色外框 + 亮度浮动 */
.discard-item :deep(.latest-tile) {
  border: 4px solid #ff4444 !important;
  border-radius: 6px;
  box-shadow: 0 0 16px rgba(255, 68, 68, 0.6), 0 0 32px rgba(255, 68, 68, 0.3);
  animation: latest-glow 1.5s ease-in-out infinite;
}

@keyframes latest-glow {
  0%, 100% {
    box-shadow: 0 0 16px rgba(255, 68, 68, 0.6), 0 0 32px rgba(255, 68, 68, 0.3);
    border-color: #ff4444;
  }
  50% {
    box-shadow: 0 0 28px rgba(255, 68, 68, 0.9), 0 0 56px rgba(255, 68, 68, 0.5);
    border-color: #ff6666;
  }
}
</style>
