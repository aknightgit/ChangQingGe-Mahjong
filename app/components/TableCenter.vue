<template>
  <div class="table-center-zone">
    <!-- 弃牌区 (中心出牌) -->
    <div class="discard-pool" v-if="discards.length">
      <div
        v-for="(tile, i) in discards"
        :key="tile.id"
        class="pool-tile"
        :class="{ 'pool-tile--latest': i === discards.length - 1 }"
      >
        <MahjongTile
          :tile="tile"
          :small="true"
          :claim-highlight="claimableId === tile.id"
        />
      </div>
    </div>

    <!-- 牌墙 -->
    <TileWall :remaining="remainingTiles" />

    <!-- 中心信息：倍数 + 百搭小牌 -->
    <div class="center-info">
      <div class="center-badges">
        <span v-if="roundMultiplier > 1" class="multiplier-badge">
          🎲 ×{{ roundMultiplier }}
        </span>
        <span v-if="globalMultiplier > 1" class="multiplier-badge multiplier-badge--global">
          📈 ×{{ globalMultiplier }}
        </span>
      </div>
      <!-- 百搭：缩小真实牌面 -->
      <div v-if="wildTile" class="wild-tile-mini">
        <MahjongTile :tile="wildTile" :small="true" />
        <span class="wild-label">百搭</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import TileWall from './TileWall.vue'
import type { Tile } from '~/types/game'

const props = defineProps<{
  discards: Tile[]
  remainingTiles: number
  statusMessage: string
  hintMessage?: string
  isWinner?: boolean
  roundMultiplier?: number
  globalMultiplier?: number
  wildTile?: Tile | null
  claimableId?: string | null
}>()
</script>

<style scoped>
.table-center-zone {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50%;
  height: 45%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  pointer-events: none;
}

/* 弃牌区 - 各玩家门前（暂时留空，后续按玩家位置分布） */
.discard-pool {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1px;
  max-width: 100%;
  max-height: 40%;
  overflow-y: auto;
  padding: 2px;
  pointer-events: auto;
}

.pool-tile { transition: transform 0.1s ease; }
.pool-tile--latest { transform: scale(1.05); animation: pop-in 0.2s ease; }

@keyframes pop-in {
  from { transform: scale(1.3) translateY(-6px); opacity: 0.5; }
  to { transform: scale(1.05); }
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
  gap: 6px;
  justify-content: center;
}

.multiplier-badge {
  background: rgba(255, 152, 0, 0.85);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(255, 152, 0, 0.35);
}

.multiplier-badge--global {
  background: rgba(233, 30, 99, 0.85);
  box-shadow: 0 2px 6px rgba(233, 30, 99, 0.35);
}

.wild-tile-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
  transform: scale(0.35);
  transform-origin: center;
}

.wild-label {
  font-size: 0.6rem;
  color: #ffd700;
  text-shadow: 0 0 4px rgba(255, 215, 0, 0.5);
}
</style>
