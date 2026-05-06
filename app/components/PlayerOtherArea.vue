<template>
  <div
    class="player-other"
    :class="`player-other--${position}`"
    :style="containerStyle"
  >
    <template v-if="position === 'top'">
      <div class="player-other-stack player-other-stack--top">
        <div class="seat-line seat-line--top">
          <div v-if="hand.length" v-memo="[hand, showHand, justDrawnTileId, isWinner, tileBackScheme]" class="hand-lane hand-lane--top top-slot top-slot--hand">
            <MahjongTile
              v-for="tile in hand"
              :key="tile.id"
              :tile="tile"
              :small="true"
              :back="!showHand"
              :back-scheme="showHand ? -1 : (tileBackScheme ?? 0)"
              :just-drawn="justDrawnTileId === tile.id"
              class="top-seat-tile"
              :dimmed="isWinner"
            />
          </div>
          <div v-if="mainMelds.length" class="meld-lane meld-lane--top top-slot top-slot--meld">
            <div
              v-for="(m, i) in mainMelds"
              :key="i"
              class="meld-group"
              :class="{ 'meld-group--kong': m.type === 'kong' }"
            >
              <MahjongTile
                v-for="t in m.tiles"
                :key="t.id"
                :tile="t"
                :small="true"
                :back="isConcealedMeld(m)"
                :back-scheme="isConcealedMeld(m) ? (tileBackScheme ?? 0) : -1"
                :class="['top-seat-tile', ...getClaimMarkerClass(m, t)]"
                :style="getClaimMarkerStyle(m)"
                :dimmed="isWinner"
              />
            </div>
          </div>
          <div v-if="flowerMelds.length" class="flower-lane flower-lane--top top-slot top-slot--flower">
            <div
              v-for="(m, i) in flowerMelds"
              :key="`flower-top-${i}`"
              class="meld-group meld-group--flower"
            >
              <MahjongTile
                v-for="t in m.tiles"
                :key="t.id"
                :tile="t"
                :small="true"
                :back="false"
                :back-scheme="-1"
                class="top-seat-tile"
                :dimmed="isWinner"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="position === 'left'">
      <div class="player-other-stack player-other-stack--left">
        <div class="seat-line seat-line--left">
          <div v-if="flowerMelds.length" class="flower-lane flower-lane--left">
            <div
              v-for="(m, i) in flowerMelds"
              :key="`flower-left-${i}`"
              class="meld-group meld-group--flower meld-group--vertical"
            >
              <MahjongTile
                v-for="t in m.tiles"
                :key="t.id"
                :tile="t"
                :small="true"
                :back="false"
                :back-scheme="-1"
                :dimmed="isWinner"
              />
            </div>
          </div>
          <div v-if="mainMelds.length" class="meld-lane meld-lane--left">
            <div
              v-for="(m, i) in mainMelds"
              :key="i"
              class="meld-group"
              :class="{ 'meld-group--kong': m.type === 'kong' }"
            >
              <MahjongTile
                v-for="t in m.tiles"
                :key="t.id"
                :tile="t"
                :small="true"
                :back="isConcealedMeld(m)"
                :back-scheme="isConcealedMeld(m) ? (tileBackScheme ?? 0) : -1"
                :class="getClaimMarkerClass(m, t)"
                :style="getClaimMarkerStyle(m)"
                :dimmed="isWinner"
              />
            </div>
          </div>
          <div v-if="hand.length" v-memo="[hand, showHand, justDrawnTileId, isWinner, tileBackScheme]" class="hand-lane hand-lane--left">
            <MahjongTile
              v-for="tile in hand"
              :key="tile.id"
              :tile="tile"
              :small="true"
              :back="!showHand"
              :back-scheme="showHand ? -1 : (tileBackScheme ?? 0)"
              :dimmed="isWinner"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="player-other-stack player-other-stack--right">
        <div class="seat-line seat-line--right">
          <div v-if="flowerMelds.length" class="flower-lane flower-lane--right">
            <div
              v-for="(m, i) in flowerMelds"
              :key="`flower-right-${i}`"
              class="meld-group meld-group--flower meld-group--vertical"
            >
              <MahjongTile
                v-for="t in m.tiles"
                :key="t.id"
                :tile="t"
                :small="true"
                :back="false"
                :back-scheme="-1"
                :dimmed="isWinner"
              />
            </div>
          </div>
          <div v-if="mainMelds.length" class="meld-lane meld-lane--right">
            <div
              v-for="(m, i) in mainMelds"
              :key="i"
              class="meld-group"
              :class="{ 'meld-group--kong': m.type === 'kong' }"
            >
              <MahjongTile
                v-for="t in m.tiles"
                :key="t.id"
                :tile="t"
                :small="true"
                :back="isConcealedMeld(m)"
                :back-scheme="isConcealedMeld(m) ? (tileBackScheme ?? 0) : -1"
                :class="getClaimMarkerClass(m, t)"
                :style="getClaimMarkerStyle(m)"
                :dimmed="isWinner"
              />
            </div>
          </div>
          <div v-if="hand.length" v-memo="[hand, showHand, justDrawnTileId, isWinner, tileBackScheme]" class="hand-lane hand-lane--right">
            <MahjongTile
              v-for="tile in hand"
              :key="tile.id"
              :tile="tile"
              :small="true"
              :back="!showHand"
              :back-scheme="showHand ? -1 : (tileBackScheme ?? 0)"
              :dimmed="isWinner"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MahjongTile from './MahjongTile.vue'
import type { Meld } from '~/types/game'

const props = defineProps<{
  position: 'top' | 'left' | 'right'
  hand: any[]
  melds: Meld[]
  tileBackScheme?: number
  showHand?: boolean
  isWinner?: boolean
  justDrawnTileId?: string | null
  viewerPosition?: number
  playerColors?: string[]
  ownerPosition?: number
}>()

const containerStyle = computed(() => ({
  position: 'relative',
  flexShrink: '0',
  flexGrow: '0',
  overflow: 'visible',
  width: '100%',
  height: props.position === 'top' ? 'auto' : '100%',
}))

const isFlowerMeld = (meld: Meld): boolean => meld.tiles.length === 1 && meld.tiles[0]?.suit === 'hua'
const colors = computed(() => props.playerColors || ['#e53935', '#43a047', '#1e88e5', '#fb8c00'])

const flowerMelds = computed(() => props.melds.filter(meld => isFlowerMeld(meld)))
const mainMelds = computed(() => props.melds.filter(meld => !isFlowerMeld(meld)))

const isConcealedMeld = (meld: Meld): boolean => meld.type === 'concealed_kong' || !!(meld as any).isConcealed

const SEAT_ROTATION_BY_POSITION: Record<'top' | 'left' | 'right', number> = {
  top: 180,
  left: 90,
  right: -90,
}

function getViewerRelativeSource(sourcePosition: number): number {
  const viewerPosition = props.viewerPosition ?? props.ownerPosition ?? 0
  return (sourcePosition - viewerPosition + 4) % 4
}

function getClaimArrowRotation(sourcePosition: number): number {
  const rel = getViewerRelativeSource(sourcePosition)
  const screenAngles: Record<number, number> = {
    0: 0,
    1: -90,
    2: 180,
    3: 90,
  }
  const seatRotation = SEAT_ROTATION_BY_POSITION[props.position] || 0
  return (screenAngles[rel] ?? 0) - seatRotation
}

function getClaimMarkerClass(meld: Meld, tile: any): string[] {
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
</script>

<style scoped>
.player-other {
  position: relative;
  flex-shrink: 0;
  flex-grow: 0;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-other--top {
  width: 100%;
}

.player-other--left,
.player-other--right {
  width: 100%;
  height: 100%;
}

.player-other-stack {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.player-other-stack--top {
  position: relative;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding-top: 4px;
}

.player-other-stack--left,
.player-other-stack--right {
  flex-direction: column;
  gap: 6px;
  height: 100%;
}

.seat-line {
  display: flex;
  flex-shrink: 0;
  overflow: visible;
}

.seat-line--top {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
}

.seat-line--left,
.seat-line--right {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: max-content;
  height: auto;
}

.seat-line--right {
  transform: rotate(-90deg);
  transform-origin: center;
}

.hand-lane,
.meld-lane,
.flower-lane {
  display: flex;
  flex-shrink: 0;
  overflow: visible;
}

.top-slot {
  flex-shrink: 0;
}

.top-slot--flower {
  justify-self: end;
  z-index: 3;
}

.top-slot--meld {
  justify-self: center;
  z-index: 2;
}

.top-slot--hand {
  justify-self: start;
  z-index: 3;
}

.hand-lane--top {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.meld-lane--top,
.flower-lane--top {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.hand-lane--left,
.hand-lane--right,
.meld-lane--left,
.meld-lane--right,
.flower-lane--left,
.flower-lane--right {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.flower-lane--left,
.flower-lane--right {
  gap: 1px;
  position: relative;
  z-index: 3;
}

.meld-group {
  display: inline-flex;
  flex-direction: row;
  gap: 2px;
  flex-shrink: 0;
  padding: 2px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  position: relative;
}

.meld-group--vertical {
  flex-direction: column;
}

.meld-lane--left,
.meld-lane--right {
  position: relative;
  z-index: 2;
}

.hand-lane--left,
.hand-lane--right {
  position: relative;
  z-index: 1;
}

.meld-group--kong {
  box-shadow: 0 0 8px rgba(255, 214, 0, 0.35);
}

.meld-group--flower {
  background: transparent;
  padding: 0;
  gap: 1px;
}

.player-other :deep(.claimed-tile) {
  position: relative;
  overflow: visible !important;
}

.player-other :deep(.claimed-tile)::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(var(--claim-arrow-rotation, 0deg));
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 20px solid var(--claim-source-color, rgba(255, 255, 255, 0.95));
  filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.42));
  z-index: 4;
}

.player-other :deep(.tile) {
  width: 28px;
  height: 40px;
  margin: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.player-other :deep(.tile--small) {
  width: 32px;
  height: 44px;
}

.player-other :deep(.tile-img) {
  border-radius: 3px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
}

.seat-line--top :deep(.top-seat-tile) {
  transform: rotate(180deg);
}

.seat-line--left {
  transform: rotate(90deg);
  transform-origin: center;
}
</style>
