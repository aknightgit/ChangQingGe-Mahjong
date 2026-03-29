<template>
  <div class="table-center-zone">
    <!-- 牌墙：双层2.5D效果 -->
    <TileWall :remaining="remainingTiles" />

    <!-- 中心信息：总倍数 + 百搭小牌 -->
    <div class="center-info">
      <div class="center-badges">
        <span class="multiplier-badge">
          🎲 总倍 ×{{ globalMultiplier || 1 }}
        </span>
      </div>
      <!-- 百搭：缩小真实牌面（无百搭时给出占位） -->
      <div v-if="wildTile" class="wild-tile-mini">
        <MahjongTile :tile="wildTile" :small="true" />
        <span class="wild-label">百搭</span>
      </div>
      <div v-else class="wild-placeholder">百搭：未定</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import TileWall from './TileWall.vue'
import type { Tile } from '~/types/game'

const props = defineProps<{
  remainingTiles: number
  statusMessage: string
  hintMessage?: string
  isWinner?: boolean
  roundMultiplier?: number
  globalMultiplier?: number
  wildTile?: Tile | null
}>()
</script>

<style scoped>
.table-center-zone {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  pointer-events: none;
}

/* 牌墙 */
.tile-wall { opacity: 0.85; pointer-events: none; }

/* 中心信息 - 只显示倍数/百搭 */
.center-info {
  text-align: center;
  pointer-events: auto;
}

.center-badges {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.multiplier-badge {
  background: rgba(255, 152, 0, 0.92);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.38);
}

.wild-tile-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
  transform: scale(0.7);
  transform-origin: center;
  filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
  border: 2px solid rgba(255, 215, 0, 0.7);
  border-radius: 4px;
  padding: 1px;
  background: rgba(255, 215, 0, 0.08);
}

.wild-label {
  font-size: 0.66rem;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.7);
}

.wild-placeholder {
  margin-top: 6px;
  font-size: 0.66rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  padding: 2px 8px;
}
</style>
