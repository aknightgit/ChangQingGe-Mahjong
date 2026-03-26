<!-- components/PlayerOtherArea.vue - 统一布局，旋转由外层seat控制 -->
<template>
  <div
    class="player-other"
    :class="{ 'player-other--winner': isWinner }"
  >
    <div class="player-other-header">
      <span class="position-dot" :class="`dot--${posColor}`"></span>
      <span v-if="avatar" class="player-avatar">{{ avatar }}</span>
      <span class="player-other-name">
        {{ name }}
        <span v-if="isWinner" class="winner-tag">胡</span>
      </span>
    </div>

    <!-- 统一布局：melds左 + hand右 -->
    <div class="player-area">
      <div class="player-other-melds" v-if="melds.length">
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
          <span v-if="meld.sourcePosition !== undefined" class="meld-arrow">
            {{ getArrowChar(meld.sourcePosition) }}
          </span>
        </div>
      </div>

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
    </div>

    <!-- 弃牌区 -->
    <div v-if="discards.length" class="player-other-discards">
      <div class="discards-row">
        <div
          v-for="(tile, idx) in discards"
          :key="tile.id"
          class="discard-item"
        >
          <span v-if="idx === discards.length - 1 && !isWinner" class="latest-arrow">▼</span>
          <MahjongTile
            :tile="tile"
            :small="true"
            :dimmed="isWinner && idx !== discards.length - 1"
            :claim-highlight="claimableDiscardTileId === tile.id"
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
  return c[props.position] || 'north'
})

// 根据相对位置返回来源箭头字符
const getArrowChar = (sourcePos: number): string => {
  // sourcePos 是绝对位置 0-3，需要根据当前玩家位置计算相对方向
  // 简化：直接用箭头
  return '←'
}
</script>

<style scoped>
.player-other {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.75rem;
  color: #f5f5f5;
}

.player-other-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  opacity: 0.9;
}

.position-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot--east { background: #f44336; box-shadow: 0 0 3px rgba(244,67,54,.5); }
.dot--south { background: #4caf50; box-shadow: 0 0 3px rgba(76,175,80,.5); }
.dot--west { background: #2196f3; box-shadow: 0 0 3px rgba(33,150,243,.5); }
.dot--north { background: #ffc107; box-shadow: 0 0 3px rgba(255,193,7,.5); }

.player-avatar {
  font-size: 0.85rem;
  line-height: 1;
}

.player-other-name {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.winner-tag {
  margin-left: 3px;
  padding: 0 3px;
  border-radius: 999px;
  background: #f44336;
  color: #fff;
  font-size: 0.6rem;
}

/* ===== 统一布局：melds左 + hand右 ===== */
.player-area {
  display: flex;
  align-items: center;
  gap: 3px;
}

.player-other-melds {
  display: flex;
  gap: 3px;
}

.other-meld {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 5px;
  background: rgba(17, 43, 33, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.other-meld--kong {
  box-shadow: 0 0 6px rgba(255, 214, 0, 0.35);
}

.meld-arrow {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.5rem;
  color: rgba(255, 255, 255, 0.4);
}

.player-other-hand {
  display: flex;
}

/* ===== 弃牌区 ===== */
.player-other-discards {
  margin-top: 2px;
}

.discards-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
}

.discard-item {
  position: relative;
}

.latest-arrow {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.55rem;
  color: #ffd700;
  text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
  animation: fa 1.2s ease-in-out infinite;
  z-index: 2;
}

@keyframes fa {
  0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
  50% { transform: translateX(-50%) translateY(-3px); opacity: 0.6; }
}
</style>
