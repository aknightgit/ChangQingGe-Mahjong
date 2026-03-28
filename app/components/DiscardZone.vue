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
        <!-- 最新弃牌箭头 -->
        <span
          v-if="tile.id === latestTileId && !isWinner"
          class="latest-arrow"
        >
          <svg viewBox="0 0 10 8" class="arrow-svg">
            <polygon points="5,8 0,0 10,0" fill="#f44336" />
          </svg>
        </span>
        <MahjongTile
          :tile="tile"
          :small="true"
          :dimmed="isWinner && tile.id !== latestTileId"
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
  grid-template-columns: repeat(6, max-content);
  gap: 2px;
}

.discard-item {
  position: relative;
}

/* 最新弃牌箭头 */
.latest-arrow {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  animation: float-arrow 1.2s ease-in-out infinite;
}

.arrow-svg {
  width: 8px;
  height: 6px;
  display: block;
  filter: drop-shadow(0 0 3px rgba(244, 67, 54, 0.6));
}

@keyframes float-arrow {
  0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
  50% { transform: translateX(-50%) translateY(-4px); opacity: 0.6; }
}

/* ===== 本家（下）===== */
.discard-zone--bottom {
  /* 位于桌面下半部分中央，偏上（靠近牌墙） */
  bottom: 25%;
  left: 50%;
  transform: translateX(-50%);
}

/* ===== 上家 ===== */
.discard-zone--top {
  /* 位于桌面上半部分中央，偏下 */
  top: 25%;
  left: 50%;
  transform: translateX(-50%) rotate(180deg);
}

/* ===== 左家 ===== */
.discard-zone--left {
  /* 位于桌面左半部分中央 */
  left: 18%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(90deg);
}

/* ===== 右家 ===== */
.discard-zone--right {
  /* 位于桌面右半部分中央 */
  right: 18%;
  top: 50%;
  transform: translate(50%, -50%) rotate(270deg);
}
</style>
