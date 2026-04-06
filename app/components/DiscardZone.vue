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
  /* P0 FIX: 弃牌区严格受容器裁剪 */
  overflow: hidden;
}

/* 空区域不占位 */
.discard-zone--empty {
  pointer-events: none;
}

.discards-grid {
  display: grid;
  /* 固定列宽：弃牌从第一张开始位置不变，不会随增多而移动 */
  grid-template-columns: repeat(8, 28px);
  gap: 1px;
  justify-items: center;
  /* P0 FIX: 网格内也裁剪 */
  overflow: hidden;
}

/* 左右弃牌区：每排6张 */
.discards-grid--left,
.discards-grid--right {
  grid-template-columns: repeat(8, 28px);
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

/* 下家弃牌：半透明红圈+发散光晕 */
.discard-zone--bottom .discard-item :deep(.latest-tile) {
  outline: 2px solid rgba(255, 68, 68, 0.5) !important;
  outline-offset: 3px;
  border-radius: 6px;
  box-shadow:
    0 0 8px rgba(255, 68, 68, 0.3),
    0 0 16px rgba(255, 68, 68, 0.15),
    0 0 32px rgba(255, 68, 68, 0.08);
  animation: latest-pulse 2s ease-in-out infinite;
}

/* 上家弃牌：半透明红圈+发散光晕 */
.discard-zone--top .discard-item :deep(.latest-tile) {
  outline: 2px solid rgba(255, 68, 68, 0.5) !important;
  outline-offset: 3px;
  border-radius: 6px;
  box-shadow:
    0 0 8px rgba(255, 68, 68, 0.3),
    0 0 16px rgba(255, 68, 68, 0.15),
    0 0 32px rgba(255, 68, 68, 0.08);
  animation: latest-pulse 2s ease-in-out infinite;
}

/* 左家弃牌：半透明红圈+发散光晕 */
.discard-zone--left .discard-item :deep(.latest-tile) {
  outline: 2px solid rgba(255, 68, 68, 0.5) !important;
  outline-offset: 3px;
  border-radius: 6px;
  box-shadow:
    0 0 8px rgba(255, 68, 68, 0.3),
    0 0 16px rgba(255, 68, 68, 0.15),
    0 0 32px rgba(255, 68, 68, 0.08);
  animation: latest-pulse 2s ease-in-out infinite;
}

/* 右家弃牌：半透明红圈+发散光晕 */
.discard-zone--right .discard-item :deep(.latest-tile) {
  outline: 2px solid rgba(255, 68, 68, 0.5) !important;
  outline-offset: 3px;
  border-radius: 6px;
  box-shadow:
    0 0 8px rgba(255, 68, 68, 0.3),
    0 0 16px rgba(255, 68, 68, 0.15),
    0 0 32px rgba(255, 68, 68, 0.08);
  animation: latest-pulse 2s ease-in-out infinite;
}

.discard-item {
  position: relative;
}

/* 最后一张弃牌：尺寸和其他牌保持一致 */
.discard-item:last-child :deep(.tile) {
  transform: none;
}

/* 所有弃牌：2.5D阴影朝向我方（中心） */
.discard-zone--bottom .discard-item :deep(.tile) {
  box-shadow: 0 -2px 4px rgba(0,0,0,0.3), 0 -3px 0 #8a7a5a, 0 -4px 0 #6a5a3a;
}
.discard-zone--top .discard-item :deep(.tile) {
  box-shadow: 0 -2px 4px rgba(0,0,0,0.3), 0 -3px 0 #8a7a5a, 0 -4px 0 #6a5a3a;
}
.discard-zone--left .discard-item :deep(.tile) {
  box-shadow: 2px 0 4px rgba(0,0,0,0.3), 3px 0 0 #8a7a5a, 4px 0 0 #6a5a3a;
}
.discard-zone--right .discard-item :deep(.tile) {
  box-shadow: -2px 0 4px rgba(0,0,0,0.3), -3px 0 0 #8a7a5a, -4px 0 0 #6a5a3a;
}

/* 最新弃牌：半透明红色outline + 发散光晕 + 呼吸动画 */
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
