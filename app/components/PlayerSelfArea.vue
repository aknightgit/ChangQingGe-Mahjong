<template>
  <div class="player-area" :class="{ 'player-area--winner': isWinner }">
    <div class="player-header">
      <div class="player-name">
        {{ name }}
        <span v-if="isWinner" class="winner-tag">胡</span>
      </div>
      <div class="player-status">
        <span v-if="isWinner">游戏结束（你赢了）</span>
        <span v-else>游戏中</span>
      </div>
    </div>

    <!-- Melds (Pung / Kong) with source dots -->
    <div class="player-melds" v-if="melds.length">
      <div
        v-for="(meld, i) in melds"
        :key="i"
        class="meld"
        :class="`meld--${meld.type}`"
      >
        <MahjongTile
          v-for="tile in meld.tiles"
          :key="tile.id"
          :tile="tile"
          :small="true"
          :dimmed="isWinner"
        />
        <!-- 来源颜色圆点 -->
        <span
          v-if="meld.sourceIndex !== undefined"
          class="meld-source"
          :style="{ background: colors[meld.sourceIndex] }"
        />
      </div>
    </div>

    <!-- 互包警告 -->
    <div v-if="bailoutCounts && Object.keys(bailoutCounts).length" class="bailout-warning">
      ⚠️ 互包:
      <span v-for="(count, playerId) in bailoutCounts" :key="playerId">
        <span class="player-dot" :style="{ background: colors[getPlayerIndex(playerId)] }" />
        ×{{ count }}
        <span v-if="count >= 3">🔥</span>
      </span>
    </div>

    <!-- Discards moved above hand (closer to table center) -->
    <div class="player-discards">
      <div class="discards-label">出牌区</div>
      <div class="discards-row">
        <MahjongTile
          v-for="(tile, i) in discards"
          :key="tile.id"
          :tile="tile"
          :small="true"
          :dimmed="isWinner && i !== discards.length - 1"
        />
      </div>
    </div>

    <!-- Hand + claim actions overlay -->
    <div class="player-hand-wrapper">
      <div class="player-hand">
        <MahjongTile
          v-for="tile in hand"
          :key="tile.id"
          :tile="tile"
          :selected="selectedTileId === tile.id"
          :just-drawn="justDrawnTileId === tile.id"
          :claim-highlight="claimCandidateIds?.includes(tile.id)"
          :dimmed="isWinner"
          @click="onTileClick(tile)"
        />
      </div>

      <div v-if="showClaimOptions && claimType" class="claim-actions">
        <span class="claim-label">
          可以{{ claimType === 'pung' ? '碰' : '杠' }}这张牌
        </span>
        <div class="claim-buttons">
          <button class="claim-button primary" @click="confirmClaim">
            {{ claimType === 'pung' ? '碰' : '杠' }}
          </button>
          <button class="claim-button" @click="skipClaim">
            过
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import type { Tile, Meld, MeldType } from '~/types/game'

const props = defineProps<{
  name: string
  hand: Tile[]
  melds: Meld[]
  discards: Tile[]
  selectedTileId?: string | null
  isWinner?: boolean
  justDrawnTileId?: string | null
  claimCandidateIds?: string[]
  showClaimOptions?: boolean
  claimType?: MeldType | null
  playerColors?: string[]
  bailoutCounts?: Record<string, number>
}>()

const colors = computed(() => props.playerColors || ['#e53935', '#43a047', '#1e88e5', '#fb8c00'])
function getPlayerIndex(playerId: string): number {
  let hash = 0
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash) + playerId.charCodeAt(i)
  }
  return Math.abs(hash) % 4
}

const emit = defineEmits<{
  (e: 'tileClick', tile: Tile): void
  (e: 'confirmClaim'): void
  (e: 'skipClaim'): void
}>()

const onTileClick = (tile: Tile) => {
  emit('tileClick', tile)
}
</script>

<style scoped>
.player-area {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px 12px;
  border-radius: 14px;
  background: rgba(5, 14, 10, 0.8);
}

.player-area--winner {
  background: rgba(3, 8, 6, 0.8);
}

.player-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.9rem;
}

.player-name {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.player-status {
  opacity: 0.8;
  font-size: 0.85rem;
}

.winner-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #f44336;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
}

.player-melds {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
}

.meld {
  display: inline-flex;
  padding: 4px 6px;
  border-radius: 8px;
  background: rgba(17, 43, 33, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.meld--kong {
  box-shadow: 0 0 10px rgba(255, 214, 0, 0.4);
}

.player-discards {
  margin-top: 0;
}

.discards-label {
  font-size: 0.8rem;
  opacity: 0.75;
  margin-bottom: 2px;
}

.discards-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* hand + claim overlay */
.player-hand-wrapper {
  position: relative;
}

.player-hand {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-height: 72px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(9, 30, 22, 0.9);
}

.claim-actions {
  position: absolute;
  top: -4px;
  right: 6px;
  transform: translateY(-100%);
  background: rgba(9, 30, 22, 0.95);
  border-radius: 10px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.6);
  font-size: 0.8rem;
  max-width: 220px;
}

.claim-label {
  display: block;
  margin-bottom: 4px;
  opacity: 0.9;
}

.claim-buttons {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.claim-button {
  padding: 4px 8px;
  border-radius: 999px;
  border: none;
  font-size: 0.8rem;
  cursor: pointer;
  background: rgba(12, 40, 30, 0.9);
  color: #e0f2e9;
}

.claim-button.primary {
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
}
/* 玩家颜色圆点 */
.player-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid white;
  margin-right: 4px;
  vertical-align: middle;
}

/* 副露来源标记 */
.meld-source {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 2px;
  vertical-align: super;
  border: 1px solid rgba(255,255,255,0.5);
}

/* 互包警告 */
.bailout-warning {
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid #ff9800;
  border-radius: 6px;
  padding: 4px 8px;
  margin: 4px 0;
  font-size: 0.75rem;
  color: #ffb74d;
  text-align: center;
}

/* 口数显示 */
.bailout-count {
  font-size: 0.7rem;
  color: #ffb74d;
  margin-left: 4px;
}
</style>