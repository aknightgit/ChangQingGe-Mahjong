<!-- components/PlayerOtherArea.vue -->
<template>
  <div
    class="player-other"
    :class="[`player-other--${position}`, { 'player-other--winner': isWinner }]"
  >
    <div class="player-other-header">
      <span class="position-dot" :class="`dot--${posColor}`"></span>
      <span v-if="avatar" class="player-avatar">{{ avatar }}</span>
      <span class="player-other-name">
        {{ name }}
        <span v-if="isWinner" class="winner-tag">胡</span>
      </span>
    </div>

    <!-- SIDE PLAYERS (West/East): melds + hand 垂直排列，melds 在下(靠中心侧) -->
    <div
      v-if="position === 'left' || position === 'right'"
      class="side-layout"
      :class="`side-layout--${position}`"
    >
      <!-- Hand（靠边的牌） -->
      <div class="player-other-hand player-other-hand--vertical">
        <MahjongTile
          v-for="tile in hand"
          :key="tile.id"
          :tile="tile"
          :small="true"
          :back="!revealHand"
          :dimmed="isWinner"
        />
      </div>

      <!-- Melds（副露，在手牌向中心延伸方向） -->
      <div
        class="player-other-melds player-other-melds--vertical"
        v-if="melds.length"
      >
        <div
          v-for="(meld, i) in melds"
          :key="i"
          class="other-meld"
          :class="`other-meld--${meld.type}`"
        >
          <MahjongTile
            v-for="tile in meld.tiles"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :dimmed="isWinner"
          />
        </div>
      </div>
    </div>

    <!-- TOP PLAYER: melds + hand 水平排列，melds 在左 -->
    <template v-else>
      <div class="top-hand-row">
        <!-- Melds（副露，在手牌左侧延伸） -->
        <div
          class="player-other-melds"
          v-if="melds.length"
        >
          <div
            v-for="(meld, i) in melds"
            :key="i"
            class="other-meld"
            :class="`other-meld--${meld.type}`"
          >
            <MahjongTile
              v-for="tile in meld.tiles"
              :key="tile.id"
              :tile="tile"
              :small="true"
              :dimmed="isWinner"
            />
          </div>
        </div>
        <!-- Hand -->
        <div class="player-other-hand">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
          :tile="tile"
          :small="true"
          :back="!revealHand"
          :dimmed="isWinner"
        />
      </div>

      <div v-if="discards.length" class="player-other-discards">
        <div class="discards-label">出牌区</div>
        <div class="discards-row">
          <MahjongTile
            v-for="tile in discards"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :dimmed="isWinner && tile.id !== discards[discards.length - 1]?.id"
            :claim-highlight="claimableDiscardTileId === tile.id"
          />
        </div>
        </div>
      </div>

      <!-- Discards (center area) -->
      <div v-if="discards.length" class="player-other-discards">
        <div class="discards-label">出牌区</div>
        <div class="discards-row">
          <MahjongTile
            v-for="tile in discards"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :dimmed="isWinner && tile.id !== discards[discards.length - 1]?.id"
            :claim-highlight="claimableDiscardTileId === tile.id"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import type { Tile, Meld } from '~/types/game'

const props = defineProps<{
  name: string
  position: 'top' | 'left' | 'right'
  hand: Tile[]
  melds: Meld[]
  discards: Tile[]
  isWinner?: boolean
  claimableDiscardTileId?: string | null
  revealHand?: boolean
  avatar?: string
}>()

const posColor = computed(() => {
  const c: Record<string, string> = { top: 'north', left: 'west', right: 'east' }
  return c[props.position] || 'south'
})
</script>

<style scoped>
.player-other {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: #f5f5f5;
}

/* 各玩家牌面朝向自己 */
.player-other--top {
  transform: rotate(180deg);
}
.player-other--left {
  transform: rotate(90deg);
}
.player-other--right {
  transform: rotate(-90deg);
}

.player-other-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  opacity: 0.9;
}

.position-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot--east { background: #f44336; box-shadow: 0 0 4px rgba(244,67,54,0.6); }
.dot--south { background: #4caf50; box-shadow: 0 0 4px rgba(76,175,80,0.6); }
.dot--west { background: #2196f3; box-shadow: 0 0 4px rgba(33,150,243,0.6); }
.dot--north { background: #ffc107; box-shadow: 0 0 4px rgba(255,193,7,0.6); }

.player-avatar {
  font-size: 0.9rem;
  line-height: 1;
}

.player-other-name {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.winner-tag {
  margin-left: 4px;
  padding: 0 4px;
  border-radius: 999px;
  background: #f44336;
  color: #fff;
  font-size: 0.7rem;
}

/* 北家：melds + hand 水平排列 */
.top-hand-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Melds */

.player-other-melds {
  display: flex;
  justify-content: center;
  gap: 4px;
}

/* For West/East: stack meld groups vertically */
.player-other-melds--vertical {
  flex-direction: column;
  align-items: center;
}

.other-meld {
  display: inline-flex;
  padding: 2px 4px;
  border-radius: 8px;
  background: rgba(17, 43, 33, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.other-meld--kong {
  box-shadow: 0 0 8px rgba(255, 214, 0, 0.4);
}

/* Side layout for West/East (hand + discards) */

.side-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

/* Left seat: [hand][discards] so discards are toward center (right side) */
.side-layout--left {
  flex-direction: row;
}

/* Right seat: [discards][hand] so discards are toward center (left side) */
.side-layout--right {
  flex-direction: row-reverse;
}

/* Hand */

.player-other-hand {
  display: flex;
  justify-content: center;
}

.player-other-hand--vertical {
  flex-direction: column;
  align-items: center;
}

/* Discards */

.player-other-discards {
  margin-top: 2px;
}

.discards-label {
  text-align: center;
  opacity: 0.7;
  font-size: 0.7rem;
  margin-bottom: 2px;
}

.discards-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px;
}

/* Vertical discards for side players */
.player-other-discards--vertical {
  margin-top: 0;
}

.discards-row--vertical {
  flex-direction: column;
  align-items: center;
  flex-wrap: nowrap;
}
</style>