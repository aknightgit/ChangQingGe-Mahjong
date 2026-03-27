<!-- components/PlayerOtherArea.vue - 统一布局，旋转由外层seat控制 -->
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

    <!-- 统一布局：melds左 + hand右 -->
    <div class="player-area">
      <div class="player-other-melds" v-if="melds.length">
        <div
          v-for="(meld, i) in melds"
          :key="i"
          class="other-meld"
          :class="[`other-meld--${meld.type}`, { 'other-meld--flower': isFlowerMeld(meld), 'other-meld--concealed': meld.type === 'concealed_kong' }]"
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

    <!-- 弃牌区：每行6张，自动换行 -->
    <div v-if="discards.length" class="player-other-discards">
      <div class="discards-grid">
        <div
          v-for="(tile, ti) in discards"
          :key="tile.id"
          class="discard-item"
        >
          <span v-if="tile.id === discards[discards.length - 1].id && !isWinner" class="latest-arrow">
            <svg viewBox="0 0 10 8" class="arrow-svg"><polygon points="5,8 0,0 10,0" fill="#f44336" /></svg>
          </span>
          <MahjongTile
            :tile="tile"
            :small="true"
            :dimmed="isWinner && tile.id !== discards[discards.length - 1].id"
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

// 弃牌区每行6张，自动换行（由CSS flex-wrap处理，无需computed）

const isFlowerMeld = (meld: Meld): boolean => {
  return meld.tiles.some(t => t.suit === 'hua' || t.isFlower)
}

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

/* 花牌 meld：金色边框 */
.other-meld--flower {
  border-color: rgba(255, 215, 0, 0.45) !important;
  background: rgba(255, 215, 0, 0.08) !important;
}

/* 暗杠 meld：紫色边框 */
.other-meld--concealed {
  border-color: rgba(171, 71, 188, 0.45) !important;
  background: rgba(171, 71, 188, 0.08) !important;
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

/* 上家：长边贴靠，水平排列 */
.player-other--top .player-other-hand {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 2px;
}

/* 左家/右家：长边贴靠，水平排列（整体旋转90°），不换行 */
.player-other--left .player-other-hand,
.player-other--right .player-other-hand {
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 0;
}

/* ===== 弃牌区：靠近中央（远离手牌，朝向牌墙）===== */
.player-other-discards {
  /* 各家位置：弃牌区在手牌和中央牌墙之间 */
  margin-top: 8px;
}

/* 上家：弃牌区在手牌上方（朝向中央） */
/* 弃牌区在手牌和中央之间（靠近中心），自然DOM顺序就够了 */
.player-other--top .player-other-discards {
  margin-bottom: 12px;
}

.player-other--left .player-other-discards {
  transform: rotate(-90deg);
  transform-origin: center center;
  margin-left: 8px;
}

.player-other--right .player-other-discards {
  margin-right: 8px;
}

.discards-grid {
  display: grid;
  grid-template-columns: repeat(6, max-content);
  gap: 1px;
}

/* 右家：座位已+90°旋转，弃牌区需要补偿旋转使牌面正向 */
.player-other--right .player-other-discards {
  transform: rotate(-90deg);
  transform-origin: center center;
  margin-right: 8px;
}

.discard-item {
  position: relative;
}

.latest-arrow {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  animation: fa 1.2s ease-in-out infinite;
}

.arrow-svg {
  width: 8px;
  height: 6px;
  display: block;
  filter: drop-shadow(0 0 3px rgba(244, 67, 54, 0.6));
}

@keyframes fa {
  0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
  50% { transform: translateX(-50%) translateY(-3px); opacity: 0.6; }
}
</style>
