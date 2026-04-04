<!--
  PlayerOtherArea - 固定位置，不换行，无弹性
  
  规则（从玩家视角顺时针方向，从外向内）：
    - 对家(top):  手牌 ↓ (牌头朝下/外)  → 门口牌 ↓
    - 左家(left): 手牌 → (牌头朝右/外)  → 门口牌 →  
    - 右家(right): 手牌 ← (牌头朝左/外)  → 门口牌 ←
  
  所有牌在一条直线上，不换行。
-->
<template>
  <div class="player-other" :class="`player-other--${position}`">

    <!-- ====== 对家（上方） ====== -->
    <!-- 手牌在外(上侧)，门口牌在内(下侧)，都旋转180°让牌头朝下 -->
    <template v-if="position === 'top'">
      <div class="line-row" data-position="top">
        <!-- 手牌区域（外侧） -->
        <div class="hand-segment">
          <MahjongTile
            v-for="tile in hand" :key="tile.id" :tile="tile" :small="true"
            :dimmed="isWinner"
            class="rotated"
          />
        </div>
        <!-- 门口牌区域（内侧） -->
        <div class="meld-segment" v-if="melds.length">
          <div v-for="(m, i) in melds" :key="i" class="meld-group-h rotated">
            <MahjongTile v-for="t in m.tiles" :key="t.id" :tile="t" :small="true" :dimmed="isWinner" />
          </div>
        </div>
      </div>
    </template>

    <!-- ====== 左家（左侧） ====== -->
    <!-- 手牌在外(左侧)，门口牌在内(右侧)，牌头朝右 -->
    <template v-else-if="position === 'left'">
      <div class="line-col" data-position="left">
        <!-- 手牌区域（外侧 = 左） -->
        <div class="hand-segment">
          <MahjongTile
            v-for="tile in hand" :key="tile.id" :tile="tile" :small="true"
            :back="true" :dimmed="isWinner"
            class="face-right"
          />
        </div>
        <!-- 门口牌区域（内侧 = 右，靠近牌桌中心） -->
        <div class="meld-segment meld-segment--left" v-if="melds.length">
          <div v-for="(m, i) in melds" :key="i" class="meld-group-v face-right">
            <MahjongTile v-for="t in m.tiles" :key="t.id" :tile="t" :small="true" :dimmed="isWinner" />
          </div>
        </div>
      </div>
    </template>

    <!-- ====== 右家（右侧） ====== -->
    <!-- 手牌在外(右侧)，门口牌在内(左侧)，牌头朝左 -->
    <template v-else>
      <div class="line-col" data-position="right">
        <!-- 门口牌区域（内侧 = 左，靠近牌桌中心） -->
        <div class="meld-segment meld-segment--right" v-if="melds.length">
          <div v-for="(m, i) in melds" :key="i" class="meld-group-v face-left">
            <MahjongTile v-for="t in m.tiles" :key="t.id" :tile="t" :small="true" :dimmed="isWinner" />
          </div>
        </div>
        <!-- 手牌区域（外侧 = 右） -->
        <div class="hand-segment">
          <MahjongTile
            v-for="tile in hand" :key="tile.id" :tile="tile" :small="true"
            :back="false" :dimmed="isWinner"
            class="face-left"
          />
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import type { Meld } from '~/types/game'

defineProps<{
  position: 'top' | 'left' | 'right'
  hand: any[]
  melds: Meld[]
  isWinner?: boolean
}>()
</script>

<style scoped>
.player-other {
  position: relative;
  /* 固定尺寸，不弹性 */
  flex-shrink: 0;
  flex-grow: 0;
}

/* ========================================
   对家：水平行（手牌←门口牌 从左到右，整体旋转180°）
   ======================================== */
.line-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  /* 不换行，不弹性 */
  flex-wrap: nowrap;
  flex-shrink: 0;
  width: fit-content;
}

.rotated {
  transform: rotate(180deg);
}

/* 对家的门口牌在左侧（旋转后右侧变左侧） */
.line-row .meld-segment {
  order: -1;
}

/* 对家的手牌在右侧 */
.line-row .hand-segment {
  order: 1;
}

/* ========================================
   左家：垂直列（手牌↑门口牌↓ 从上到下 = 从外往内）
   ======================================== */
.line-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  /* 不换行，不弹性 */
  flex-wrap: nowrap;
  flex-shrink: 0;
  width: fit-content;
}

.face-right .meld-group-v,
.face-left .meld-group-v {
  /* 门口牌组，不换行 */
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 1px;
  padding: 2px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 4px;
  background: rgba(255,255,255,0.03);
}

.line-col[data-position="left"] .meld-segment {
  order: 2;  /* 底部（内侧，靠近牌桌中心） */
}

.line-col[data-position="left"] .hand-segment {
  order: 1;  /* 顶部（外侧） */
}

.line-col[data-position="right"] .meld-segment {
  order: 1;  /* 顶部（内侧，靠近牌桌中心） */
}

.line-col[data-position="right"] .hand-segment {
  order: 2;  /* 底部（外侧） */
}

/* ========================================
   通用样式
   ======================================== */
.hand-segment {
  display: flex;
  gap: 2px;
  /* 不换行 */
  flex-wrap: nowrap;
  flex-shrink: 0;
  width: fit-content;
}

.meld-segment {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
  width: fit-content;
}

.meld-segment--left {
  /* 左家的门口牌 */
}

.meld-segment--right {
  /* 右家的门口牌 */
}

.meld-group-h {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 1px;
  padding: 2px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 4px;
  background: rgba(255,255,255,0.03);
}
</style>
