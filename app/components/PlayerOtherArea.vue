<!-- components/PlayerOtherArea.vue - 统一布局，旋转由外层seat控制 -->
<template>
  <div class="player-other" :class="[`player-other--${position}`, { 'player-other--winner': isWinner }]">
    <div class="player-other-header" v-if="position === 'top'">
      <span class="position-dot" :class="`dot--${posColor}`"></span>
      <PlayerAvatar :name="name" class="player-avatar" :is-active="false" />
      <span class="player-other-name player-other-name--clickable" @click.stop="$emit('nameClick')">
        {{ name }}
      </span>
    </div>

    <div class="player-area" :class="`player-area--${position}`">
      <!-- left: bug3修复: 门口牌在边缘, 手牌在靠近牌桌中心 -->
      <template v-if="position === 'left'">
        <div class="player-other-header-left">
          <PlayerAvatar :name="name" class="player-avatar-left" :is-active="false" />
          <span class="player-other-name player-other-name--clickable" @click.stop="$emit('nameClick')">
            {{ name }}
          </span>
        </div>
        <!-- bug3: 门口牌在上(边缘), 旋转90度 -->
        <div class="player-other-melds" v-if="melds.length">
          <div v-for="(meld, i) in melds" :key="i" class="other-meld"
            :class="[`other-meld--${meld.type}`, { 'other-meld--flower': isFlowerMeld(meld) }]">
            <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" :small="true" :dimmed="isWinner" />
            <!-- bug5: 只显示箭头，移除文字 -->
            <span v-if="meld.sourcePosition !== undefined" class="meld-arrow"></span>
          </div>
        </div>
        <!-- bug3: 手牌在下(靠近牌桌中心) -->
        <div class="player-other-hand">
          <MahjongTile v-for="tile in hand" :key="tile.id" :tile="tile" :small="true" :back="true" :dimmed="isWinner" />
        </div>
      </template>

      <!-- right/top: melds在前 -->
      <template v-else>
        <div v-if="position === 'right'" class="player-other-header-right">
          <PlayerAvatar :name="name" class="player-avatar-right" :is-active="false" />
          <span class="player-other-name player-other-name--clickable" @click.stop="$emit('nameClick')">
            {{ name }}
          </span>
        </div>
        <!-- bug4: 右家门口牌旋转-90度 -->
        <div class="player-other-melds" v-if="melds.length">
          <div v-for="(meld, i) in melds" :key="i" class="other-meld"
            :class="[`other-meld--${meld.type}`, { 'other-meld--flower': isFlowerMeld(meld) }]">
            <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" :small="true" :dimmed="isWinner" />
            <!-- bug5: 只显示箭头 -->
            <span v-if="meld.sourcePosition !== undefined" class="meld-arrow"></span>
          </div>
        </div>
        <div class="player-other-hand">
          <MahjongTile v-for="tile in hand" :key="tile.id" :tile="tile" :small="true" :back="true" :dimmed="isWinner" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import PlayerAvatar from './PlayerAvatar.vue'
import type { Tile, Meld } from '~/types/game'

const props = defineProps<{ position: 'top' | 'left' | 'right'; hand: Tile[]; melds: Meld[]; isWinner?: boolean; name: string }>()
const emit = defineEmits<{ (e: 'nameClick'): void }>()

const posColor = computed(() => ({ top: 'north', left: 'west', right: 'east' }[props.position] || 'north'))
const isFlowerMeld = (m: Meld) => m.tiles.some(t => t.suit === 'hua' || t.isFlower)
</script>

<style scoped>
.player-other { display: flex; flex-direction: column; gap: 3px; font-size: 0.75rem; color: #f5f5f5; }

/* bug1: 对家离牌桌6% */
.player-other--top { flex-direction: column-reverse; margin-top: 6%; }
.player-other-header { display: flex; justify-content: center; align-items: center; gap: 4px; opacity: 0.9; }
.player-other-header-left, .player-other-header-right { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 6px; }
.player-avatar, .player-avatar-left, .player-avatar-right { width: 36px; height: 36px; }
.player-other-name { display: none; }

.player-area { display: flex; gap: 3px; }
.player-area--top { flex-direction: row; align-items: center; }
.player-area--left { flex-direction: column; align-items: center; }
.player-area--right { flex-direction: column-reverse; align-items: center; }

.player-other-hand { display: flex; }
.player-other--top .player-other-hand { flex-direction: row; flex-wrap: nowrap; gap: 1px; }

/* bug3: 左家手牌 column-reverse，旋转后视觉横向 */
.player-other--left .player-other-hand { flex-direction: column-reverse; flex-wrap: nowrap; row-gap: 3px; align-items: center; }

.player-other--right .player-other-hand { flex-direction: column; flex-wrap: nowrap; row-gap: 3px; align-items: center; }

/* 2.5D 阴影 */
.player-other--top .player-other-hand :deep(.tile) {
  width: 32px; height: 26px; flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), 0 3px 0 #8a7a5a, 0 5px 0 #6a5a3a;
}
.player-other--left .player-other-hand :deep(.tile) {
  width: 36px; height: 25px; flex-shrink: 0;
  box-shadow: 1px 0 0 #8a7a5a, 2px 0 0 #6a5a3a, 0 3px 6px rgba(0,0,0,0.3);
}
.player-other--left .player-other-hand :deep(.tile:first-child) {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 2px 4px 0 #8a7a5a, 3px 6px 0 #6a5a3a, 0 6px 12px rgba(0,0,0,0.45);
  transform: translateY(3px) scale(1.06); z-index: 1;
}
.player-other--right .player-other-hand :deep(.tile) {
  width: 36px; height: 25px; flex-shrink: 0;
  box-shadow: -1px 0 0 #8a7a5a, -2px 0 0 #6a5a3a, 0 3px 6px rgba(0,0,0,0.3);
}
.player-other--right .player-other-hand :deep(.tile:last-child) {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), -2px 4px 0 #8a7a5a, -3px 6px 0 #6a5a3a, 0 6px 12px rgba(0,0,0,0.45);
  transform: translateY(-2px);
}

/* 门口牌 */
.player-other-melds { display: flex; gap: 2px; }
.other-meld { display: inline-flex; align-items: center; padding: 1px; border-radius: 4px;
  background: rgba(17, 43, 33, 0.85); border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative; margin-bottom: 4px; }
.other-meld--flower { border-color: transparent !important; background: transparent !important; }

/* bug5: 箭头(无文字, 红色) */
.meld-arrow { position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
  width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent;
  border-bottom: 7px solid #ff4444; filter: drop-shadow(0 0 2px rgba(255,68,68,0.5)); }

/* bug3: 左家门口牌旋转90度 */
.player-other--left .player-other-melds { flex-direction: row; gap: 4px; flex-wrap: nowrap; transform: rotate(90deg); }
.player-other--left .player-other-melds :deep(.tile) { width: 36px; height: 25px; }
.player-other--left .player-other-hand { margin-top: 8px; }

/* bug4: 右家门口牌旋转-90度 */
.player-other--right .player-other-melds { flex-direction: row; gap: 4px; flex-wrap: nowrap; transform: rotate(-90deg); }
.player-other--right .player-other-melds :deep(.tile) { width: 36px; height: 25px; }

.player-other--top .player-other-melds { gap: 4px; flex-wrap: nowrap; }
</style>
