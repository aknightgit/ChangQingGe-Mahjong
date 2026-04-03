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
      <!-- left: bug3修复: 门口牌在上(靠近边缘), 手牌在下(靠近牌桌中心) -->
      <template v-if="position === 'left'">
        <div class="player-other-header-left">
          <PlayerAvatar :name="name" class="player-avatar-left" :is-active="false" />
          <span class="player-other-name player-other-name--clickable" @click.stop="$emit('nameClick')">
            {{ name }}
            <span v-if="isWinner" class="winner-tag">胡</span>
          </span>
        </div>
        <!-- bug3: 门口牌在上 -->
        <!-- bug3: 手牌在上(靠近边缘) -->
        <div class="player-other-hand player-other-hand--left">
          <MahjongTile v-for="tile in hand" :key="tile.id" :tile="tile" :small="true" :back="true" :dimmed="isWinner" />
        </div>
        <!-- bug3: 门口牌在下(靠近牌桌中心) -->
        <div class="player-other-melds" v-if="melds.length">
          <div v-for="(meld, i) in melds" :key="i" class="other-meld"
            :class="[`other-meld--${meld.type}`, { 'other-meld--flower': isFlowerMeld(meld), 'other-meld--concealed': meld.type === 'concealed_kong' }]">
            <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" :small="true" :dimmed="isWinner" />
            <!-- bug5: 只显示箭头，无文字 -->
            <span v-if="meld.sourcePosition !== undefined" class="meld-arrow"></span>
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
        <div class="player-other-melds" v-if="melds.length">
          <div v-for="(meld, i) in melds" :key="i" class="other-meld"
            :class="[`other-meld--${meld.type}`, { 'other-meld--flower': isFlowerMeld(meld), 'other-meld--concealed': meld.type === 'concealed_kong' }]">
            <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" :small="true" :dimmed="isWinner" />
            <!-- bug5: 只显示箭头，无文字 -->
            <span v-if="meld.sourcePosition !== undefined" class="meld-arrow"></span>
          </div>
        </div>
        <div class="player-other-hand" :class="{ 'player-other-hand--right': position === 'right' }">
          <MahjongTile v-for="tile in hand" :key="tile.id" :tile="tile" :small="true" :back="position !== 'left'" :dimmed="isWinner" />
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
</script>

<style scoped>
.player-other { display: flex; flex-direction: column; gap: 3px; font-size: 0.75rem; color: #f5f5f5; }

/* bug1: 对家离牌桌6% */
.player-other--top { flex-direction: column-reverse; margin-top: 6%; }
.player-other-header { display: flex; justify-content: center; align-items: center; gap: 4px; opacity: 0.9; }
.player-other-header-left, .player-other-header-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.player-avatar, .player-avatar-left, .player-avatar-right { width: 36px; height: 36px; }
.player-other-name { font-weight: 600; font-size: 0.85rem; }
.player-other-name--clickable { text-decoration: underline dotted rgba(255,255,255,0.25); text-underline-offset: 3px; cursor: pointer; }
.winner-tag { margin-left: 3px; padding: 0 3px; border-radius: 999px; background: #f44336; color: #fff; font-size: 0.6rem; }

.player-area { display: flex; gap: 3px; }
.player-area--top { flex-direction: row; align-items: center; }
.player-area--left { flex-direction: column; align-items: flex-start; }
.player-area--right { flex-direction: column-reverse; align-items: flex-end; }

.player-other-hand { display: flex; flex-direction: row; flex-wrap: nowrap; gap: 1px; overflow: visible; }
.player-other--top .player-other-hand :deep(.tile) {
  width: 32px; height: 26px; flex-shrink: 0;
  box-shadow: 0 3px 0 #8a7a5a, 0 5px 0 #6a5a3a, 0 6px 10px rgba(0,0,0,0.45);
}

/* bug3: 左家column-reverse(旋转后视觉横向), 手牌在靠近中心 */
.player-other--left .player-other-hand {
  flex-direction: column-reverse;
  flex-wrap: nowrap;
  row-gap: 3px;
  align-items: center;
}
.player-other--left .player-other-hand :deep(.tile) {
  width: 36px; height: 25px; flex-shrink: 0;
  box-shadow: 1px 0 0 #8a7a5a, 2px 0 0 #6a5a3a, 0 3px 6px rgba(0,0,0,0.3);
}
.player-other--left .player-other-hand :deep(.tile:first-child) {
  box-shadow: 2px 4px 0 #8a7a5a, 3px 6px 0 #6a5a3a, 0 6px 12px rgba(0,0,0,0.45);
  transform: translateY(3px) scale(1.06); z-index: 1;
}

/* 右家column(旋转后视觉横向) */
.player-other--right .player-other-hand {
  display: flex; flex-direction: column; flex-wrap: nowrap; row-gap: 3px; align-items: center;
}
.player-other--right .player-other-hand :deep(.tile) {
  width: 36px; height: 25px; flex-shrink: 0;
  box-shadow: -1px 0 0 #8a7a5a, -2px 0 0 #6a5a3a, 0 3px 6px rgba(0,0,0,0.3);
}
.player-other--right .player-other-hand :deep(.tile:last-child) {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), -2px 4px 0 #8a7a5a, -3px 6px 0 #6a5a3a;
  transform: translateY(-2px);
}

/* bug3+4: 门口牌水平排列+旋转 */
.player-other-melds {
  display: flex; flex-direction: row; gap: 2px; flex-wrap: nowrap;
  padding: 2px; border-radius: 4px;
  background: rgba(17, 43, 33, 0.85); border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.other-meld {
  display: inline-flex; align-items: center; padding: 1px; border-radius: 4px;
  background: rgba(17, 43, 33, 0.85); border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative; margin-bottom: 4px;
}
.other-meld--flower { border-color: transparent !important; background: transparent !important; }
.other-meld--concealed { border-color: rgba(171, 71, 188, 0.45) !important; background: rgba(171, 71, 188, 0.08) !important; }
.other-meld--kong { box-shadow: 0 0 6px rgba(255, 214, 0, 0.35); }

/* bug3: 左家门口牌旋转90度 */
.player-other--left .player-other-melds { transform: rotate(90deg); }
/* bug4: 右家门口牌旋转-90度 */
.player-other--right .player-other-melds { transform: rotate(-90deg); }
.player-other--top .player-other-melds { }
.player-other--left .player-other-melds :deep(.tile),
.player-other--right .player-other-melds :deep(.tile) { width: 36px; height: 25px; }

/* bug5: 纯箭头(红色三角)，无文字 */
.meld-arrow {
  position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 4px solid transparent; border-right: 4px solid transparent;
  border-bottom: 7px solid #ff4444;
  filter: drop-shadow(0 0 3px rgba(255,68,68,0.5));
}

/* 对家 2.5D 修复 */
.player-other-avatar--top {
  display: inline-block;
  transform: rotate(180deg);
}

/*.player-other-melds { flex-wrap: nowrap; }*/
</style>
