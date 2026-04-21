<template>
  <!-- SOFT GUARD: all opponent hand/meld lane geometry here is currently stable.
       Any future edits to seat hand direction/spacing/rotation should be treated as high risk
       and require explicit user approval before changing. -->
  <div
    class="player-other"
    :class="`player-other--${position}`"
    :style="containerStyle"
  >
    <template v-if="position === 'top'">
      <div class="seat-line seat-line--top">
        <div v-if="hand.length" class="hand-lane hand-lane--top">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :back-scheme="0"
            :dimmed="isWinner"
          />
        </div>
        <div v-if="melds.length" class="meld-lane meld-lane--top">
          <div
            v-for="(m, i) in melds"
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
              :back-scheme="isConcealedMeld(m) ? 0 : -1"
              :class="{ 'top-exposed-tile': !isConcealedMeld(m) }"
              :dimmed="isWinner"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="position === 'left'">
      <div class="seat-line seat-line--left">
        <div v-if="melds.length" class="meld-lane meld-lane--left">
          <div
            v-for="(m, i) in melds"
            :key="i"
            class="meld-group meld-group--vertical"
            :class="{ 'meld-group--kong': m.type === 'kong' }"
          >
            <MahjongTile
              v-for="t in m.tiles"
              :key="t.id"
              :tile="t"
              :small="true"
              :back="isConcealedMeld(m)"
              :back-scheme="isConcealedMeld(m) ? 0 : -1"
              :dimmed="isWinner"
            />
          </div>
        </div>
        <div v-if="hand.length" class="hand-lane hand-lane--left">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :back-scheme="0"
            :dimmed="isWinner"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="seat-line seat-line--right">
        <div v-if="hand.length" class="hand-lane hand-lane--right">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :back-scheme="0"
            :dimmed="isWinner"
          />
        </div>
        <div v-if="melds.length" class="meld-lane meld-lane--right">
          <div
            v-for="(m, i) in melds"
            :key="i"
            class="meld-group meld-group--vertical"
            :class="{ 'meld-group--kong': m.type === 'kong' }"
          >
            <MahjongTile
              v-for="t in m.tiles"
              :key="t.id"
              :tile="t"
              :small="true"
              :back="isConcealedMeld(m)"
              :back-scheme="isConcealedMeld(m) ? 0 : -1"
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
  isWinner?: boolean
}>()

const containerStyle = computed(() => ({
  position: 'relative',
  flexShrink: '0',
  flexGrow: '0',
  overflow: 'visible',
  width: '100%',
  height: props.position === 'top' ? 'auto' : '100%',
}))

const isConcealedMeld = (meld: Meld): boolean => {
  return meld.type === 'concealed_kong' || !!(meld as any).isConcealed
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

.seat-line {
  display: flex;
  flex-shrink: 0;
  overflow: visible;
}

.seat-line--top {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
}

.seat-line--left,
.seat-line--right {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
}

.hand-lane,
.meld-lane {
  display: flex;
  flex-shrink: 0;
  overflow: visible;
}

.hand-lane--top,
.meld-lane--top {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.hand-lane--left,
.hand-lane--right,
.meld-lane--left,
.meld-lane--right {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.meld-group {
  display: inline-flex;
  flex-direction: row;
  gap: 2px;
  flex-shrink: 0;
  padding: 2px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
}

.meld-group--vertical {
  flex-direction: column;
}

.meld-lane--left .meld-group--vertical,
.meld-lane--right .meld-group--vertical {
  flex-direction: row;
}

.meld-group--kong {
  box-shadow: 0 0 8px rgba(255, 214, 0, 0.35);
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
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)) brightness(1.08);
}

.meld-lane--top :deep(.top-exposed-tile) {
  transform: rotate(180deg);
}

.hand-lane--left,
.meld-lane--left {
  transform: rotate(90deg);
  transform-origin: center;
}

.hand-lane--right,
.meld-lane--right {
  transform: rotate(-90deg);
  transform-origin: center;
}
</style>
