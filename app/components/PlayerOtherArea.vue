<!-- components/PlayerOtherArea.vue - 统一布局，旋转由外层seat控制 -->
<template>
  <div class="player-other" :class="[`player-other--${position}`, { 'player-other--winner': isWinner }]">
    <div class="player-other-header" v-if="position === 'top'">
      <span class="position-dot" :class="`dot--${posColor}`"></span>
      <PlayerAvatar :name="name" class="player-avatar" :is-active="false" />
      <span class="player-other-name player-other-name--clickable" @click.stop="$emit('nameClick')">
        {{ name }}
        <span v-if="isWinner" class="winner-tag">胡</span>
      </span>
    </div>

    <div class="player-area" :class="`player-area--${position}`">
      <!-- left -->
      <template v-if="position === 'left'">
        <div class="player-other-header-left">
          <PlayerAvatar :name="name" class="player-avatar-left" :is-active="false" />
          <span class="player-other-name player-other-name--clickable" @click.stop="$emit('nameClick')">
            {{ name }}
            <span v-if="isWinner" class="winner-tag">胡</span>
          </span>
        </div>
        <div class="player-other-hand player-other-hand--left">
          <MahjongTile v-for="tile in hand" :key="tile.id" :tile="tile" :small="true" :back="true" :dimmed="isWinner" />
        </div>
        <div class="player-other-melds" v-if="melds.length">
          <div v-for="(meld, i) in melds" :key="i" class="other-meld"
            :class="[`other-meld--${meld.type}`, { 'other-meld--flower': isFlowerMeld(meld), 'other-meld--concealed': meld.type === 'concealed_kong' }]">
            <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" :small="true" :dimmed="isWinner" />
            <span v-if="meld.sourcePosition !== undefined" class="meld-arrow" :style="{ transform: `translateX(-50%) rotate(${arrowRotation(meld.sourcePosition)})` }"></span>
          </div>
        </div>
      </template>

      <!-- right/top -->
      <template v-else>
        <div v-if="position === 'right'" class="player-other-header-right">
          <PlayerAvatar :name="name" class="player-avatar-right" :is-active="false" />
          <span class="player-other-name player-other-name--clickable" @click.stop="$emit('nameClick')">
            {{ name }}
            <span v-if="isWinner" class="winner-tag">胡</span>
          </span>
        </div>
        <div class="player-other-hand player-other-hand--right">
          <MahjongTile v-for="tile in hand" :key="tile.id" :tile="tile" :small="true" :back="false" :dimmed="isWinner" />
        </div>
        <div class="player-other-melds" v-if="melds.length">
          <div v-for="(meld, i) in melds" :key="i" class="other-meld"
            :class="[`other-meld--${meld.type}`, { 'other-meld--flower': isFlowerMeld(meld), 'other-meld--concealed': meld.type === 'concealed_kong' }]">
            <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" :small="true" :dimmed="isWinner" />
            <span v-if="meld.sourcePosition !== undefined" class="meld-arrow" :style="{ transform: `translateX(-50%) rotate(${arrowRotation(meld.sourcePosition)})` }"></span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import PlayerAvatar from './PlayerAvatar.vue'
import type { Tile, Meld } from '~/types/game'

const props = withDefaults(defineProps<{
  name: string
  position: 'top' | 'left' | 'right'
  hand: Tile[]
  melds: Meld[]
  isWinner?: boolean
  seatPosition?: number
}>(), { isWinner: false })

const emit = defineEmits<{ (e: 'nameClick'): void }>()

const posColor = computed(() => {
  const c: Record<string, string> = { top: 'north', left: 'west', right: 'east' }
  return c[props.position] || 'north'
})

const isFlowerMeld = (meld: Meld): boolean => {
  return meld.tiles.some(t => t.suit === 'hua' || t.isFlower)
}

const arrowRotation = (sourcePos: number): string => {
  if (props.seatPosition === undefined) return '0deg'
  const delta = (sourcePos - props.seatPosition + 4) % 4
  if (delta === 0) return '0deg'       // 自己：朝上
  if (delta === 1) return '90deg'      // 下家：朝右
  if (delta === 2) return '180deg'     // 对家：朝下
  return '270deg'                       // 上家：朝左
}
</script>

<style scoped>
/* ===== 基础 ===== */
.player-other { display: flex; flex-direction: column; gap: 3px; font-size: 0.75rem; color: #f5f5f5; }

/* 头像固定大小，不挤压 */
.player-avatar, .player-avatar-left, .player-avatar-right {
  width: 36px; height: 36px; flex-shrink: 0; min-width: 36px; min-height: 36px;
}

.player-other-header { display: flex; justify-content: center; align-items: center; gap: 4px; opacity: 0.9; }
.player-other-header-left, .player-other-header-right {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.player-other-name { font-weight: 600; font-size: 0.85rem; }
.player-other-name--clickable { text-decoration: underline dotted rgba(255,255,255,0.25); text-underline-offset: 3px; cursor: pointer; }
.winner-tag { margin-left: 3px; padding: 0 3px; border-radius: 999px; background: #f44336; color: #fff; font-size: 0.6rem; }

/* ===== player-area: 手牌 + 门口牌的容器 ===== */
.player-area { display: flex; gap: 4px; }

/* 对家：水平排列手牌+门口 */
.player-area--top { flex-direction: row; align-items: center; margin-top: 3%; margin-bottom: 2%; }

/* 左家：垂直排列 头像→手牌→门口(从外到内) */
.player-area--left { flex-direction: column-reverse; align-items: center; }

/* 右家：垂直排列 头像→门口→手牌(从外到内) */
.player-area--right { flex-direction: column-reverse; align-items: flex-end; }

/* ===== 手牌 ===== */
.player-other-hand { display: flex; flex-wrap: nowrap; overflow: visible; }

/* 对家手牌 */
.player-other--top .player-other-hand {
  flex-direction: row; gap: 1px;
}
.player-other--top .player-other-hand :deep(.tile) {
  width: 32px; height: 26px; flex-shrink: 0;
  box-shadow: 0 3px 0 #8a7a5a, 0 5px 0 #6a5a3a, 0 6px 10px rgba(0,0,0,0.45);
}

/* 左家手牌：纵向排列（座位旋转90度后视觉上横向） */
.player-other--left .player-other-hand {
  flex-direction: column-reverse; gap: 3px; align-items: center;
}
.player-other--left .player-other-hand :deep(.tile) {
  width: 36px; height: 25px; flex-shrink: 0;
  box-shadow: 2px 0 0 #8a7a5a, 3px 0 0 #6a5a3a, 0 3px 6px rgba(0,0,0,0.3);
}
.player-other--left .player-other-hand :deep(.tile:first-child) {
  box-shadow: 3px 4px 0 #8a7a5a, 5px 6px 0 #6a5a3a, 0 6px 12px rgba(0,0,0,0.45);
  transform: translateX(3px) scale(1.06); z-index: 1;
}

/* 右家手牌：纵向排列（座位旋转-90度后视觉上横向） */
.player-other--right .player-other-hand {
  flex-direction: column; gap: 3px; align-items: center;
}
.player-other--right .player-other-hand :deep(.tile) {
  width: 36px; height: 25px; flex-shrink: 0;
  box-shadow: -2px 0 0 #8a7a5a, -3px 0 0 #6a5a3a, 0 3px 6px rgba(0,0,0,0.3);
}
.player-other--right .player-other-hand :deep(.tile:last-child) {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), -3px 4px 0 #8a7a5a, -5px 6px 0 #6a5a3a;
  transform: translateX(-2px);
}

/* ===== 门口牌 ===== */
.player-other-melds {
  display: flex; flex-direction: row; gap: 2px; flex-wrap: nowrap;
  padding: 2px; border-radius: 4px;
  background: rgba(17, 43, 33, 0.85); border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative; flex-shrink: 0;
}

.other-meld {
  display: inline-flex; align-items: center; padding: 1px; border-radius: 4px;
  background: rgba(17, 43, 33, 0.85); border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}
.other-meld--flower { border-color: transparent !important; background: transparent !important; }
.other-meld--concealed { border-color: rgba(171, 71, 188, 0.45) !important; background: rgba(171, 71, 188, 0.08) !important; }
.other-meld--kong { box-shadow: 0 0 6px rgba(255, 214, 0, 0.35); }

/* 左家门口牌：旋转90度，和手牌方向一致 */
.player-other--left .player-other-melds { transform: rotate(90deg); }
/* 右家门口牌：旋转-90度，和手牌方向一致 */
.player-other--right .player-other-melds { transform: rotate(-90deg); }
/* 门口牌tile尺寸 */
.player-other--left .player-other-melds :deep(.tile),
.player-other--right .player-other-melds :deep(.tile) { width: 36px; height: 25px; }

/* ===== 箭头指示（吃碰来源） ===== */
.meld-arrow {
  position: absolute; bottom: -10px; left: 50%;
  width: 0; height: 0;
  border-left: 4px solid transparent; border-right: 4px solid transparent;
  border-bottom: 7px solid #ff4444;
  filter: drop-shadow(0 0 3px rgba(255,68,68,0.5));
  transform-origin: center center;
}

/*.player-other-melds { flex-wrap: nowrap; }*/
</style>
