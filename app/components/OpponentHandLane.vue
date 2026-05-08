<template>
  <div
    v-if="hand.length"
    v-memo="[handMemoKey, showHand, justDrawnTileId, isWinner, tileBackScheme, position]"
    :class="laneClass"
  >
    <MahjongTile
      v-for="tile in hand"
      :key="tile.id"
      :tile="tile"
      :small="true"
      :back="!showHand"
      :back-scheme="showHand ? -1 : (tileBackScheme ?? 0)"
      :just-drawn="position === 'top' && justDrawnTileId === tile.id"
      :class="tileClass"
      :dimmed="isWinner"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MahjongTile from './MahjongTile.vue'

const props = defineProps<{
  position: 'top' | 'left' | 'right'
  hand: any[]
  tileBackScheme?: number
  showHand?: boolean
  isWinner?: boolean
  justDrawnTileId?: string | null
}>()

const laneClass = computed(() => ({
  'hand-lane': true,
  'hand-lane--top': props.position === 'top',
  'hand-lane--left': props.position === 'left',
  'hand-lane--right': props.position === 'right',
  'top-slot': props.position === 'top',
  'top-slot--hand': props.position === 'top',
}))

const tileClass = computed(() => (props.position === 'top' ? 'top-seat-tile' : ''))
const handMemoKey = computed(() => props.hand.map(tile => tile?.id || '').join('|'))
</script>

<style scoped>
.hand-lane {
  contain: layout paint;
  transform: translateZ(0);
  backface-visibility: hidden;
}
</style>
