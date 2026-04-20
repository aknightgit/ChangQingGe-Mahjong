<template>
  <div
    class="player-other"
    :class="`player-other--${position}`"
    :style="containerStyle"
  >
    <template v-if="position === 'top'">
      <div class="unified-col unified-col--top">
        <div v-if="hand.length" class="hand-row hand-row--top">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :dimmed="isWinner"
          />
        </div>
        <div v-if="melds.length" class="meld-row meld-row--top">
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
              :dimmed="isWinner"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="position === 'left'">
      <div class="unified-col unified-col--left">
        <div v-if="hand.length" class="hand-zone">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :dimmed="isWinner"
          />
        </div>
        <div v-if="melds.length" class="meld-zone">
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
              :dimmed="isWinner"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="unified-col unified-col--right">
        <div v-if="melds.length" class="meld-zone">
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
              :dimmed="isWinner"
            />
          </div>
        </div>
        <div v-if="hand.length" class="hand-zone">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :dimmed="isWinner"
          />
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

.unified-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.unified-col--top {
  width: 100%;
  align-items: center;
}

.unified-col--left,
.unified-col--right {
  height: 100%;
  justify-content: center;
}

.unified-col--left {
  align-items: flex-end;
}

.unified-col--right {
  align-items: flex-start;
}

.hand-row--top,
.meld-row--top {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 1px;
}

.hand-zone,
.meld-zone {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hand-row--top {
  max-width: 100%;
}

.meld-row--top {
  margin-top: 4px;
}

.meld-group {
  display: inline-flex;
  flex-direction: row;
  gap: 1px;
  flex-shrink: 0;
  padding: 1px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
}

.meld-group--kong {
  box-shadow: 0 0 8px rgba(255, 214, 0, 0.4);
}

.player-other :deep(.tile) {
  width: 28px;
  height: 40px;
}
</style>
