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
          <div
            v-for="tile in sortedHand"
            :key="tile.id"
            class="player-hand-tile"
            :class="{
              'player-hand-tile--selected': selectedTileId === tile.id,
              'player-hand-tile--dragging': dragState?.tile.id === tile.id
            }"
            :style="getTileWrapperStyle(tile)"
          >
            <button
              v-if="showDiscardConfirm && selectedTileId === tile.id"
              type="button"
              class="tile-discard-confirm"
              @click.stop="onTileConfirmDiscard(tile)"
            >出牌</button>
            <MahjongTile
              :tile="tile"
              :selected="selectedTileId === tile.id"
              :just-drawn="justDrawnTileId === tile.id"
              :claim-highlight="claimCandidateIds?.includes(tile.id)"
              :dimmed="isWinner"
              @click="onTileClick(tile)"
              @dblclick="onTileDblclick(tile)"
              @pointerdown="onPointerDown($event, tile)"
              @pointermove="onPointerMove($event)"
              @pointerup="onPointerUp($event)"
              @pointercancel="onPointerCancel"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MahjongTile from './MahjongTile.vue'
import PlayerAvatar from './PlayerAvatar.vue'
import type { Tile, Meld } from '~/types/game'

type DiscardMode = 'double_tap' | 'tap_confirm' | 'drag'

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
  discardMode?: DiscardMode
  dragDiscardThresholdPx?: number
  showDiscardConfirm?: boolean
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
const onTileConfirmDiscard = (tile: Tile) => emit('tileDiscard', tile)

const dragThreshold = computed(() => {
  const threshold = Number(props.dragDiscardThresholdPx)
  return Number.isFinite(threshold) && threshold > 0 ? threshold : 56
})

const dragState = ref<{ pointerId: number; startX: number; startY: number; x: number; y: number; tile: Tile } | null>(null)

const onPointerDown = (event: PointerEvent, tile: Tile) => {
  if (props.isWinner) return
  if (props.discardMode !== 'drag') return
  try {
    const target = event.currentTarget as Element | null
    target?.setPointerCapture?.(event.pointerId)
  } catch {}
  dragState.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    x: 0,
    y: 0,
    tile
  }
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragState.value || props.discardMode !== 'drag') return
  if (dragState.value.pointerId !== event.pointerId) return
  dragState.value = {
    ...dragState.value,
    x: event.clientX - dragState.value.startX,
    y: event.clientY - dragState.value.startY,
  }
}

const onPointerUp = (event: PointerEvent) => {
  if (!dragState.value || props.discardMode !== 'drag') return
  if (dragState.value.pointerId !== event.pointerId) return
  try {
    const target = event.currentTarget as Element | null
    target?.releasePointerCapture?.(event.pointerId)
  } catch {}
  const { x, y, tile } = dragState.value
  const dist = Math.sqrt(x * x + y * y)
  const towardsCenter = y <= -dragThreshold.value
  dragState.value = null

  if (dist >= dragThreshold.value && towardsCenter) {
    emit('tileDiscard', tile)
  }
}

const onPointerCancel = () => {
  dragState.value = null
}

const getTileWrapperStyle = (tile: Tile): Record<string, string> => {
  if (!dragState.value || dragState.value.tile.id !== tile.id || props.discardMode !== 'drag') {
    return {}
  }
  const limitedX = Math.max(-28, Math.min(28, dragState.value.x))
  const limitedY = Math.min(0, Math.max(-96, dragState.value.y))
  return {
    transform: `translate(${limitedX}px, ${limitedY}px)`,
    zIndex: '8'
  }
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

.player-hand-tile {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.12s ease;
  touch-action: none;
}

.player-hand-tile--dragging {
  transition: none;
}

.tile-discard-confirm {
  position: absolute;
  left: 0;
  right: 0;
  top: -22px;
  height: 18px;
  border: 0;
  border-radius: 6px 6px 4px 4px;
  background: linear-gradient(135deg, #c62828, #ef5350);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 8px rgba(198, 40, 40, 0.35);
  z-index: 9;
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
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--claim-source-color, rgba(255,255,255,0.95));
  border: 2px solid rgba(255,255,255,0.92);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.42);
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

@media (max-width: 900px) and (orientation: landscape) {
  :deep(.claimed-tile)::after {
    top: -5px;
    width: 8px;
    height: 8px;
    border-width: 1.5px;
  }
}
</style>
