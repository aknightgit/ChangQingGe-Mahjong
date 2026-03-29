<!-- components/PlayerOtherArea.vue - 统一布局，旋转由外层seat控制 -->
<template>
  <div
    class="player-other"
    :class="[`player-other--${position}`, { 'player-other--winner': isWinner }]"
  >
    <div class="player-other-header" v-if="position === 'top'">
      <span class="position-dot" :class="`dot--${posColor}`"></span>
      <span v-if="avatar" class="player-avatar">{{ avatar }}</span>
      <span class="player-other-name">
        {{ name }}
        <span v-if="isWinner" class="winner-tag">胡</span>
      </span>
    </div>

    <!-- 布局方向由 position 控制：
         top/bottom: flex-row, hand左 + melds右（melds在玩家左手边）
         left: column, hand上 + meld下（meld在玩家左手边=下）
         right: column, meld上 + hand下（meld在玩家左手边=上） -->
    <div class="player-area" :class="`player-area--${position}`">
      <!-- left: hand在上(边缘), melds在下(靠近牌桌中心/蓝圈位置) -->
      <template v-if="position === 'left'">
        <div class="player-other-hand player-other-hand--left">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :dimmed="isWinner"
          />
        </div>
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
      </template>

      <!-- right/top: melds在前 -->
      <template v-else>
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

        <div class="player-other-hand" :class="{ 'player-other-hand--right': position === 'right' }">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="position !== 'left'"
            :dimmed="isWinner"
          />
        </div>
      </template>
    </div>

    <!-- 弃牌区已移至独立的 DiscardZone 组件，不再在此渲染 -->
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
  isWinner?: boolean
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

/* 对家：名字放上方（朝牌桌中心），整体下移30px */
.player-other--top {
  flex-direction: column-reverse;
  margin-top: 40px;
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

/* ===== 布局：由 position 类控制方向 ===== */
.player-area {
  display: flex;
  gap: 3px;
}

/* top/bottom: 水平排列，hand左 + melds右（meld在player左手边） */
.player-area--top,
.player-area--bottom {
  flex-direction: row;
  align-items: center;
}

/* left: 垂直排列，hand上 + meld下（player左手=桌下=底部） */
.player-area--left {
  flex-direction: column;
  align-items: center;
}

/* right: 垂直排列，meld上 + hand下（player左手=桌上=顶部） */
.player-area--right {
  flex-direction: column-reverse;
  align-items: center;
}

.player-other-melds {
  display: flex;
  gap: 2px;
}

.other-meld {
  display: inline-flex;
  align-items: center;
  padding: 1px;
  border-radius: 4px;
  background: rgba(17, 43, 33, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

/* 花牌 meld：无边框 */
.other-meld--flower {
  border-color: transparent !important;
  background: transparent !important;
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

/* 左家/右家：纵向排列，限制高度防止溢出 */
.player-other--left .player-other-hand,
.player-other--right .player-other-hand {
  flex-direction: column;
  flex-wrap: wrap;
  gap: 0;
  align-content: flex-start;
}
/* 左右手牌去掉3D阴影和边框，消除缝隙 */
.player-other--left .player-other-hand :deep(.tile),
.player-other--right .player-other-hand :deep(.tile) {
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  margin: 0;
  border: none;
  border-radius: 2px;
}

/* 左家手牌：牌背朝中心（旋转90°） */
.player-other-hand--left :deep(.tile) {
  transform: rotate(90deg);
  filter: brightness(0.85);
}
/* 右家手牌：牌背朝中心（旋转-90°） */
.player-other-hand--right :deep(.tile) {
  transform: rotate(-90deg);
  filter: brightness(0.85);
}

/* 左家门口：靠边缘（order -1） */
.player-other--left .player-other-melds {
  flex-direction: column;
  gap: 0;
  flex-shrink: 0;
  order: -1;
}
.player-other--left .player-other-melds :deep(.tile) {
  transform: rotate(90deg);
}
.player-other--left .player-other-hand {
  margin-top: 30px;
}

/* 右家门口：靠中心 */
.player-other--right .player-other-melds {
  flex-direction: column;
  gap: 0;
  flex-shrink: 0;
  margin-top: 30px;
}
.player-other--right .player-other-melds :deep(.tile) {
  transform: rotate(-90deg);
}

/* 上家 melds：紧凑排列 */
.player-other--top .player-other-melds {
  gap: 2px;
}
</style>
