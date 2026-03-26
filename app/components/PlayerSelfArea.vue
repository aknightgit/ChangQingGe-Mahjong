<template>
  <div class="player-area" :class="{ 'player-area--winner': isWinner }">
    <!-- 互包警告 -->
    <div v-if="bailoutCounts && Object.keys(bailoutCounts).length" class="bailout-warning">
      ⚠️ 互包:
      <span v-for="(count, playerId) in bailoutCounts" :key="playerId">
        <span class="player-dot" :style="{ background: colors[getPlayerIndex(playerId)] }" />
        ×{{ count }}
        <span v-if="count >= 3">🔥</span>
      </span>
    </div>

    <!-- 主区域：melds左 + 手牌右（含出牌区 overlay） -->
    <div class="player-main-row">
      <!-- 门口牌：左侧 -->
      <div class="player-melds" v-if="melds.length">
        <div
          v-for="(meld, i) in melds"
          :key="i"
          class="meld"
          :class="[`meld--${meld.type}`, { 'meld--flower': isFlowerMeld(meld), 'meld--concealed': meld.type === 'concealed_kong' }]"
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

      <!-- 手牌 + 出牌区 overlay -->
      <div class="player-hand-wrapper">
        <!-- 出牌区：叠在手牌上方 -->
        <div class="player-discards" v-if="discards.length">
          <div class="discards-row">
            <div
              v-for="(tile, i) in discards"
              :key="tile.id"
              class="discard-item"
            >
              <span v-if="i === discards.length - 1 && !isWinner" class="latest-arrow">▼</span>
              <MahjongTile
                :tile="tile"
                :small="true"
                :dimmed="isWinner && i !== discards.length - 1"
              />
            </div>
          </div>
        </div>

        <!-- 手牌 -->
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

        <!-- 碰杠操作浮层 -->
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
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import type { Tile, Meld, MeldType } from '~/types/game'

const props = defineProps<{
  hand: Tile[]
  melds: Meld[]
  discards: Tile[]
  selectedTileId?: string | null
  isWinner?: boolean
  justDrawnTileId?: string | null
  claimCandidateIds?: string[]
  showClaimOptions?: boolean
  claimType?: MeldType | null

}>()

const colors = computed(() => props.playerColors || ['#e53935', '#43a047', '#1e88e5', '#fb8c00'])

const isFlowerMeld = (meld: Meld): boolean => {
  return meld.tiles.some(t => t.suit === 'hua' || t.isFlower)
}
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
  background: transparent;
}

.player-area--winner {
  background: transparent;
}

/* 主行：melds 左 + 手牌右 */
.player-main-row {
  display: flex;
  align-items: center;
  gap: 8px;
}


.player-melds {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 50px;
}

.meld {
  display: inline-flex;
  align-items: center;
  padding: 4px 6px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* 花牌 meld：金色边框 + 背景 */
.meld--flower {
  border-color: rgba(255, 215, 0, 0.45) !important;
  background: rgba(255, 215, 0, 0.08) !important;
}

/* 暗杠 meld：紫色边框 + 背景 */
.meld--concealed {
  border-color: rgba(171, 71, 188, 0.45) !important;
  background: rgba(171, 71, 188, 0.08) !important;
}

.meld--kong {
  box-shadow: 0 0 10px rgba(255, 214, 0, 0.4);
}

.player-discards {
  position: absolute;
  top: -50px;
  left: 0;
  z-index: 10;
}

.discards-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.discard-item {
  position: relative;
}

.latest-arrow {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  color: #ffd700;
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.6);
  animation: float-arrow 1.2s ease-in-out infinite;
  z-index: 2;
}

@keyframes float-arrow {
  0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
  50% { transform: translateX(-50%) translateY(-4px); opacity: 0.6; }
}

/* hand + claim overlay */
.player-hand-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.player-hand {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-height: 72px;
  padding: 4px;
  border-radius: 10px;
  background: transparent;
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
  color: #fff;
}

.claim-button.primary {
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #fff;
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