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
            @dblclick="onTileDblclick(tile)"
            @pointerdown="onPointerDown($event, tile)"
            @pointerup="onPointerUp($event)"
            @pointercancel="onPointerCancel"
          />
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import type { Tile, Meld } from '~/types/game'

const props = defineProps<{
  hand: Tile[]
  melds: Meld[]
  selectedTileId?: string | null
  isWinner?: boolean
  justDrawnTileId?: string | null
  claimCandidateIds?: string[]
  bailoutCounts?: Record<string, number>
  playerColors?: string[]
}>()

const colors = computed(() => props.playerColors || ['#e53935', '#43a047', '#1e88e5', '#fb8c00'])

const isFlowerMeld = (meld: Meld): boolean => {
  return meld.tiles.some(t => t.suit === 'hua' || t.isFlower)
}

// 弃牌区每行6张，自动换行（由CSS flex-wrap处理，无需computed）
function getPlayerIndex(playerId: string): number {
  let hash = 0
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash) + playerId.charCodeAt(i)
  }
  return Math.abs(hash) % 4
}

const emit = defineEmits<{
  (e: 'tileClick', tile: Tile): void
  (e: 'tileDblclick', tile: Tile): void
  (e: 'tileDiscard', tile: Tile): void
}>()

const confirmClaim = () => {
  // Claim logic handled by parent via availableActions
  // This button is part of the claim overlay (unused in current flow)
}

const skipClaim = () => {
  // Skip claim - parent handles via pass action
}

const onTileClick = (tile: Tile) => {
  emit('tileClick', tile)
}

const onTileDblclick = (tile: Tile) => {
  emit('tileDblclick', tile)
}

// ===== 拖拽出牌（pointer 事件 + 距离阈值） =====
const DRAG_THRESHOLD = 15 // px
let pointerStart: { x: number; y: number; tile: Tile } | null = null

const onPointerDown = (event: PointerEvent, tile: Tile) => {
  if (props.isWinner) return
  pointerStart = { x: event.clientX, y: event.clientY, tile }
}

const onPointerUp = (event: PointerEvent) => {
  if (!pointerStart) return
  const dx = event.clientX - pointerStart.x
  const dy = event.clientY - pointerStart.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const tile = pointerStart.tile
  pointerStart = null

  if (dist >= DRAG_THRESHOLD) {
    // 拖拽超过阈值 → 出牌
    emit('tileDiscard', tile)
  }
  // 距离 < 阈值 → 不做任何事（正常 click 事件会处理）
}

const onPointerCancel = () => {
  pointerStart = null
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

/* hand + claim overlay */
.player-hand-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.player-hand {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  align-content: center;
  justify-content: center;
  min-height: 72px;
  padding: 4px;
  border-radius: 10px;
  background: transparent;
  max-width: 100%;
}

.player-hand :deep(.tile) {
  cursor: pointer;
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