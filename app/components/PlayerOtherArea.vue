<template>
  <div
    v-memo="[areaMemoKey, justDrawnTileId, isWinner, tileBackScheme]"
    class="player-other"
    :class="`player-other--${position}`"
    :style="containerStyle"
  >
    <template v-if="position === 'top'">
      <div class="player-other-stack player-other-stack--top">
        <div class="seat-line seat-line--top">
          <OpponentHandLane
            position="top"
            :hand="hand"
            :tile-back-scheme="tileBackScheme"
            :show-hand="showHand"
            :is-winner="isWinner"
            :just-drawn-tile-id="justDrawnTileId"
          />
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
          <OpponentHandLane
            position="left"
            :hand="hand"
            :tile-back-scheme="tileBackScheme"
            :show-hand="showHand"
            :is-winner="isWinner"
            :just-drawn-tile-id="justDrawnTileId"
          />
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
          <OpponentHandLane
            position="right"
            :hand="hand"
            :tile-back-scheme="tileBackScheme"
            :show-hand="showHand"
            :is-winner="isWinner"
            :just-drawn-tile-id="justDrawnTileId"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MahjongTile from './MahjongTile.vue'
import OpponentHandLane from './OpponentHandLane.vue'
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
const handMemoKey = computed(() => props.hand.map(tile => tile?.id || '').join('|'))
const meldMemoKey = computed(() => props.melds
  .map(meld => [
    meld?.type || '',
    meld?.sourceTileId || '',
    meld?.sourcePosition ?? '',
    (meld?.tiles || []).map(tile => tile?.id || '').join(',')
  ].join(':'))
  .join('|'))
const areaMemoKey = computed(() => [
  props.position,
  handMemoKey.value,
  meldMemoKey.value,
  props.showHand ? '1' : '0',
  props.ownerPosition ?? '',
  props.viewerPosition ?? ''
].join('|'))

const isConcealedMeld = (meld: Meld): boolean => meld.type === 'concealed_kong' || !!(meld as any).isConcealed

function getOwnerRelativeSource(sourcePosition: number): number {
  const ownerPosition = props.ownerPosition ?? props.viewerPosition ?? 0
  return (sourcePosition - ownerPosition + 4) % 4
}

function getClaimArrowRotation(sourcePosition: number): number {
  const rel = getOwnerRelativeSource(sourcePosition)
  const rotationBySeat: Record<'top' | 'left' | 'right', Record<number, number>> = {
    // rel=1: 右家, rel=2: 对家, rel=3: 左家
    top: { 1: 90, 2: 0, 3: -90 },
    left: { 1: 180, 2: -90, 3: 0 },
    right: { 1: 0, 2: 90, 3: 180 },
  }
  return rotationBySeat[props.position]?.[rel] ?? 0
}

function getClaimMarkerClass(meld: Meld, tile: any): string[] {
  if (!meld.sourceTileId || meld.sourceTileId !== tile.id || meld.type === 'concealed_kong') return []
  return meld.sourcePosition !== undefined ? ['claimed-tile'] : []
}

function getClaimMarkerStyle(meld: Meld): Record<string, string> {
  if (meld.sourcePosition === undefined) return {}
  return {
    '--claim-source-color': colors.value[meld.sourcePosition] || '#757575',
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
  contain: layout paint;
  transform: translateZ(0);
  backface-visibility: hidden;
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
  width: max-content;
  min-width: max-content;
}

.seat-line {
  display: flex;
  flex-shrink: 0;
  overflow: visible;
  contain: layout paint;
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
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  width: max-content;
  min-width: max-content;
  height: auto;
}
.meld-lane--left,
.meld-lane--right {
  position: absolute;
  top: 0;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  gap: 2px;
  z-index: 10;
}
.flower-lane--left,
.flower-lane--right {
  position: absolute;
  top: 0;
  left: 100%;
  margin-left: 4px;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 2px;
  z-index: 10;
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

.meld-lane--right,
.flower-lane--right {
  justify-content: flex-start;
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

.player-other :deep(.tile) {
  width: 28px;
  height: 40px;
  margin: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.player-other :deep(.tile--small) {
  width: 28px;
  height: 40px;
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

@media (max-width: 900px) and (orientation: landscape) {
  .player-other :deep(.tile--small) {
    width: 15px;
    height: 22px;
  }

  .seat-line--left,
  .seat-line--right {
    gap: 4px;
  }

  .hand-lane--left,
  .hand-lane--right,
  .meld-lane--left,
  .meld-lane--right,
  .flower-lane--left,
  .flower-lane--right {
    gap: 1px;
  }

  .player-other :deep(.claimed-tile)::after {
    top: -5px;
    width: 8px;
    height: 8px;
    border-width: 1.5px;
  }
}
</style>
