<template>
  <div class="player-area" :class="{ 'player-area--winner': isWinner }">
    <div class="self-player-header">
      <PlayerAvatar :name="name" class="self-avatar" :is-active="false" />
      <span class="self-player-name">
        {{ name }}
        <span v-if="isWinner" class="winner-tag">胡</span>
      </span>
    </div>

    <div v-if="bailoutCounts && Object.keys(bailoutCounts).length" class="bailout-warning">
      互包提醒:
      <span v-for="(count, playerId) in bailoutCounts" :key="playerId">
        <span class="player-dot" :style="{ background: colors[getPlayerIndex(playerId)] }" />
        x{{ count }}
        <span v-if="count >= 3">!</span>
      </span>
    </div>

    <div class="player-main-row">
      <div class="player-flowers" v-if="flowerMelds.length">
        <div
          v-for="(meld, i) in flowerMelds"
          :key="`flower-${i}`"
          class="meld meld--flower"
        >
          <MahjongTile
            v-for="tile in meld.tiles"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="false"
            :back-scheme="-1"
            :dimmed="isWinner"
          />
        </div>
      </div>

      <div class="player-melds" v-if="mainMelds.length">
        <div
          v-for="(meld, i) in mainMelds"
          :key="i"
          class="meld"
          :class="[`meld--${meld.type}`, { 'meld--concealed': meld.type === 'concealed_kong' }]"
        >
          <MahjongTile
            v-for="tile in meld.tiles"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="isConcealedMeld(meld)"
            :back-scheme="isConcealedMeld(meld) ? (tileBackScheme ?? 0) : -1"
            :class="getClaimMarkerClass(meld, tile)"
            :style="getClaimMarkerStyle(meld)"
            :dimmed="isWinner"
          />
        </div>
      </div>

      <div class="player-hand-wrapper">
        <div class="player-hand">
          <MahjongTile
            v-for="tile in sortedHand"
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
import { computed } from 'vue'
import MahjongTile from './MahjongTile.vue'
import PlayerAvatar from './PlayerAvatar.vue'
import type { Tile, Meld } from '~/types/game'

const props = defineProps<{
  name?: string
  hand: Tile[]
  melds: Meld[]
  tileBackScheme?: number
  selectedTileId?: string | null
  isWinner?: boolean
  justDrawnTileId?: string | null
  claimCandidateIds?: string[]
  bailoutCounts?: Record<string, number>
  playerColors?: string[]
  viewerPosition?: number
  ownerPosition?: number
}>()

const sortedHand = computed(() => props.hand)
const colors = computed(() => props.playerColors || ['#e53935', '#43a047', '#1e88e5', '#fb8c00'])

const isFlowerMeld = (meld: Meld): boolean => meld.tiles.some(tile => tile.suit === 'hua' || tile.isFlower)
const flowerMelds = computed(() => props.melds.filter(meld => isFlowerMeld(meld)))
const mainMelds = computed(() => props.melds.filter(meld => !isFlowerMeld(meld)))

const isConcealedMeld = (meld: Meld): boolean => {
  return meld.type === 'concealed_kong' || !!(meld as any).isConcealed
}

function getViewerRelativeSource(sourcePosition: number): number {
  const viewerPosition = props.viewerPosition ?? props.ownerPosition ?? 0
  return (sourcePosition - viewerPosition + 4) % 4
}

function getClaimArrowRotation(sourcePosition: number): number {
  const relativePos = getViewerRelativeSource(sourcePosition)
  // rel=1: 右家, rel=2: 对家, rel=3: 左家
  const rotationByRelative: Record<number, number> = {
    1: -90,
    2: 180,
    3: 90,
  }
  return rotationByRelative[relativePos] ?? 0
}

function getClaimMarkerClass(meld: Meld, tile: Tile): string[] {
  if (!meld.sourceTileId || meld.sourceTileId !== tile.id || meld.type === 'concealed_kong') return []
  return meld.sourcePosition !== undefined ? ['claimed-tile'] : []
}

function getClaimMarkerStyle(meld: Meld): Record<string, string> {
  if (meld.sourcePosition === undefined) return {}
  return {
    '--claim-source-color': colors.value[meld.sourcePosition] || '#757575',
    '--claim-arrow-rotation': `${getClaimArrowRotation(meld.sourcePosition)}deg`,
  }
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
  (e: 'tileDblclick', tile: Tile): void
  (e: 'tileDiscard', tile: Tile): void
}>()

const onTileClick = (tile: Tile) => emit('tileClick', tile)
const onTileDblclick = (tile: Tile) => emit('tileDblclick', tile)

const DRAG_THRESHOLD = 15
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
    emit('tileDiscard', tile)
  }
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
  padding: 0 10px 6px;
  border-radius: 14px;
  background: transparent;
  width: 100%;
  bottom: 0;
}

.player-area--winner {
  background: transparent;
}

.self-player-header {
  display: none;
}

.self-avatar {
  width: 40px;
  height: 40px;
}

.self-player-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: #f5f5f5;
  display: none;
}

.winner-tag {
  margin-left: 3px;
  padding: 0 3px;
  border-radius: 999px;
  background: #f44336;
  color: #fff;
  font-size: 0.6rem;
}

.player-main-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  overflow: visible;
  max-width: 100%;
}

.player-melds {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 50px;
  flex-shrink: 0;
  overflow: visible;
  z-index: 2;
}

.player-flowers {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 50px;
  flex-shrink: 0;
  overflow: visible;
  position: relative;
  z-index: 1;
}

.meld {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 4px 6px;
  padding-top: 16px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.meld--flower {
  border-color: transparent !important;
  background: transparent !important;
  padding: 0 1px 0 0;
  gap: 1px;
}

.meld--flower + .meld--flower {
  margin-left: -7px;
}

.meld--concealed {
  border-color: rgba(171, 71, 188, 0.45) !important;
  background: rgba(171, 71, 188, 0.08) !important;
}

.meld--kong {
  box-shadow: 0 0 10px rgba(255, 214, 0, 0.4);
}

.player-hand-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  overflow: visible;
  z-index: 3;
}

.player-hand {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  justify-content: center;
  min-height: 82px;
  padding: 4px 2px 6px;
  border-radius: 10px;
  background: transparent;
  max-width: none;
  width: fit-content;
  margin: 0 auto;
  gap: 2px;
}

.player-hand :deep(.tile) {
  cursor: pointer;
  margin: 0 0 2px 0;
  width: 31.5px;
  height: 45.8px;
}

.player-melds :deep(.tile) {
  width: 28.6px;
  height: 41.2px;
}

.player-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid white;
  margin-right: 4px;
  vertical-align: middle;
}

:deep(.claimed-tile) {
  position: relative;
  overflow: visible !important;
}

:deep(.claimed-tile)::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(var(--claim-arrow-rotation, 0deg));
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 20px solid var(--claim-source-color, rgba(255,255,255,0.95));
  filter: drop-shadow(0 0 3px rgba(0,0,0,0.42));
  z-index: 4;
}

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

.bailout-count {
  font-size: 0.7rem;
  color: #ffb74d;
  margin-left: 4px;
}
</style>
