<template>
  <div
    class="player-other"
    :class="`player-other--${position}`"
    :style="containerStyle"
  >
    <!-- ==================== 对家（top） ==================== -->
    <template v-if="position === 'top'">
      <div class="player-other-stack player-other-stack--top">
        <!-- 手牌 + 花牌（同一行，整体 180° 旋转） -->
        <div class="seat-line seat-line--top">
          <div v-if="hand.length" class="hand-lane hand-lane--top">
            <MahjongTile
              v-for="tile in hand"
              :key="tile.id"
              :tile="tile"
              :small="true"
              :back="true"
              :back-scheme="0"
              :just-drawn="justDrawnTileId === tile.id"
              :dimmed="isWinner"
            />
          </div>
          <!-- 花牌：紧跟手牌右侧，旋转 180° 让牌头朝牌桌中心 -->
          <div v-if="flowerMelds.length" class="flower-lane flower-lane--top-inline">
            <div
              v-for="(m, i) in flowerMelds"
              :key="`flower-top-${i}`"
              class="meld-group meld-group--flower"
            >
              <MahjongTile
                v-for="t in m.tiles"
                :key="t.id"
                :tile="t"
                :small="true"
                :back="false"
                :back-scheme="-1"
                :dimmed="isWinner"
              />
            </div>
          </div>
        </div>
        <!-- 门口牌（吃碰杠） -->
        <div v-if="mainMelds.length" class="meld-lane meld-lane--top">
          <div
            v-for="(m, i) in mainMelds"
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
                :back-scheme="isConcealedMeld(m) ? 0 : -1"
                :class="[getClaimMarkerClass(m, t), { 'top-exposed-tile': !isConcealedMeld(m) }]"
                :dimmed="isWinner"
              />
            <!-- 吃碰来源标签 -->
            <span
              v-if="m.sourcePosition !== undefined && !isConcealedMeld(m)"
              class="meld-source meld-source--top"
              :class="getSourceArrowClass(m.sourcePosition)"
            >{{ getSourceLabel(m.sourcePosition) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== 左家（left） ==================== -->
    <template v-else-if="position === 'left'">
      <div class="player-other-stack player-other-stack--left">
        <div v-if="flowerMelds.length" class="flower-lane flower-lane--left">
          <div
            v-for="(m, i) in flowerMelds"
            :key="`flower-left-${i}`"
            class="meld-group meld-group--flower meld-group--vertical"
          >
            <MahjongTile
              v-for="t in m.tiles"
              :key="t.id"
              :tile="t"
              :small="true"
              :back="false"
              :back-scheme="-1"
              :dimmed="isWinner"
            />
          </div>
        </div>
        <div class="seat-line seat-line--left">
          <div v-if="hand.length" class="hand-lane hand-lane--left">
            <MahjongTile
              v-for="tile in hand"
              :key="tile.id"
              :tile="tile"
              :small="true"
              :back="true"
              :back-scheme="0"
              :dimmed="isWinner"
            />
          </div>
          <div v-if="mainMelds.length" class="meld-lane meld-lane--left">
            <div
              v-for="(m, i) in mainMelds"
              :key="i"
              class="meld-group meld-group--vertical"
              :class="{ 'meld-group--kong': m.type === 'kong' }"
            >
              <MahjongTile
                v-for="t in m.tiles"
                :key="t.id"
                :tile="t"
                :small="true"
                :back="isConcealedMeld(m)"
                :back-scheme="isConcealedMeld(m) ? 0 : -1"
                :class="getClaimMarkerClass(m, t)"
                :dimmed="isWinner"
              />
              <span
                v-if="m.sourcePosition !== undefined && !isConcealedMeld(m)"
                class="meld-source meld-source--left"
                :class="getSourceArrowClass(m.sourcePosition)"
              >{{ getSourceLabel(m.sourcePosition) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== 右家（right） ==================== -->
    <template v-else>
      <div class="player-other-stack player-other-stack--right">
        <div class="seat-line seat-line--right">
          <div v-if="flowerMelds.length" class="flower-lane flower-lane--right">
            <div
              v-for="(m, i) in flowerMelds"
              :key="`flower-right-${i}`"
              class="meld-group meld-group--flower meld-group--vertical"
            >
              <MahjongTile
                v-for="t in m.tiles"
                :key="t.id"
                :tile="t"
                :small="true"
                :back="false"
                :back-scheme="-1"
                :dimmed="isWinner"
              />
            </div>
          </div>
          <div v-if="mainMelds.length" class="meld-lane meld-lane--right">
            <div
              v-for="(m, i) in mainMelds"
              :key="i"
              class="meld-group meld-group--vertical"
              :class="{ 'meld-group--kong': m.type === 'kong' }"
            >
              <MahjongTile
                v-for="t in m.tiles"
                :key="t.id"
                :tile="t"
                :small="true"
                :back="isConcealedMeld(m)"
                :back-scheme="isConcealedMeld(m) ? 0 : -1"
                :class="getClaimMarkerClass(m, t)"
                :dimmed="isWinner"
              />
              <span
                v-if="m.sourcePosition !== undefined && !isConcealedMeld(m)"
                class="meld-source meld-source--right"
                :class="getSourceArrowClass(m.sourcePosition)"
              >{{ getSourceLabel(m.sourcePosition) }}</span>
            </div>
          </div>
          <div v-if="hand.length" class="hand-lane hand-lane--right">
            <MahjongTile
              v-for="tile in hand"
              :key="tile.id"
              :tile="tile"
              :small="true"
              :back="true"
              :back-scheme="0"
              :dimmed="isWinner"
            />
          </div>
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
  justDrawnTileId?: string | null
  playerPosition?: number
}>()

const containerStyle = computed(() => ({
  position: 'relative',
  flexShrink: '0',
  flexGrow: '0',
  overflow: 'visible',
  width: '100%',
  height: props.position === 'top' ? 'auto' : '100%',
}))

const isFlowerMeld = (meld: Meld): boolean => {
  return meld.tiles.length === 1 && meld.tiles[0]?.suit === 'hua'
}

const flowerMelds = computed(() => props.melds.filter(meld => isFlowerMeld(meld)))
const mainMelds = computed(() => props.melds.filter(meld => !isFlowerMeld(meld)))

const isConcealedMeld = (meld: Meld): boolean => {
  return meld.type === 'concealed_kong' || !!(meld as any).isConcealed
}

// sourcePosition: 1=下家, 2=对家, 3=上家（0自家不会出现）
function getRelativeSource(sourcePosition: number): number {
  const observerPos = props.playerPosition ?? 0
  return (observerPos - sourcePosition + 4) % 4
}

function getSourceLabel(sourcePosition: number): string {
  const rel = getRelativeSource(sourcePosition)
  return ['自', '下', '对', '上'][rel] || ''
}

function getSourceArrowClass(sourcePosition: number): string {
  const rel = getRelativeSource(sourcePosition)
  return ['src--lower', 'src--opposite', 'src--upper'][rel - 1] || 'src--opposite'
}

function getClaimMarkerClass(meld: Meld, tile: any): string[] {
  if (!meld.sourceTileId || meld.sourceTileId !== tile.id || meld.type === 'concealed_kong') return []
  const tone = meld.sourcePosition !== undefined ? getSourceArrowClass(meld.sourcePosition) : 'src--self'
  return ['claimed-tile', `claimed-tile--${tone}`]
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

.player-other-stack {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.player-other-stack--top {
  position: relative;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding-top: 4px;
}

.player-other-stack--left,
.player-other-stack--right {
  flex-direction: column;
  gap: 6px;
  height: 100%;
}

/* ---- seat-line ---- */
.seat-line {
  display: flex;
  flex-shrink: 0;
  overflow: visible;
}

.seat-line--top {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 100%;
}

.seat-line--left,
.seat-line--right {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  height: 100%;
}

.seat-line--right {
  gap: 44px;
}

/* ---- hand / meld / flower lanes ---- */
.hand-lane,
.meld-lane,
.flower-lane {
  display: flex;
  flex-shrink: 0;
  overflow: visible;
}

.hand-lane--top {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.meld-lane--top {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1px;
  margin-top: 2px;
}

/* 对家花牌：内联手牌右侧，旋转 180° 让牌头朝牌桌中心 */
.flower-lane--top-inline {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 1px;
  margin-left: 4px;
  transform: rotate(180deg);
}

.hand-lane--left,
.hand-lane--right,
.meld-lane--left,
.meld-lane--right,
.flower-lane--left,
.flower-lane--right {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.meld-group {
  display: inline-flex;
  flex-direction: row;
  gap: 2px;
  flex-shrink: 0;
  padding: 2px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  position: relative;
}

.meld-group--vertical {
  flex-direction: column;
}

.meld-lane--left .meld-group--vertical,
.meld-lane--right .meld-group--vertical {
  flex-direction: row;
}

.meld-group--kong {
  box-shadow: 0 0 8px rgba(255, 214, 0, 0.35);
}

.meld-group--flower {
  background: transparent;
  padding: 0;
}

/* ---- 吃碰来源标签 ---- */
.meld-source {
  position: absolute;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  padding: 1px 3px;
  border-radius: 3px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 2;
}

/* 对家：标签在 meld 上方 */
.meld-source--top {
  top: -2px;
  left: 50%;
  transform: translateX(-50%) rotate(180deg);
}

/* 左家 / 右家：标签在 meld 旁边 */
.meld-source--left,
.meld-source--right {
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
}

.player-other :deep(.claimed-tile) {
  position: relative;
}

.player-other :deep(.claimed-tile)::after {
  content: '';
  position: absolute;
  top: -9px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 18px solid rgba(255, 255, 255, 0.95);
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.4));
}

.player-other :deep(.claimed-tile--src--lower)::after {
  border-top-color: rgba(67, 160, 71, 0.95);
  transform: translateX(-50%) rotate(-90deg);
}

.player-other :deep(.claimed-tile--src--opposite)::after {
  border-top-color: rgba(30, 136, 229, 0.95);
  transform: translateX(-50%) rotate(180deg);
}

.player-other :deep(.claimed-tile--src--upper)::after {
  border-top-color: rgba(251, 140, 0, 0.95);
  transform: translateX(-50%) rotate(90deg);
}

.src--lower   { background: rgba(67, 160, 71, 0.85); color: #fff; }
.src--opposite{ background: rgba(30, 136, 229, 0.85); color: #fff; }
.src--upper   { background: rgba(251, 140, 0, 0.85); color: #fff; }

/* ---- tile 尺寸 ---- */
.player-other :deep(.tile) {
  width: 28px;
  height: 40px;
  margin: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.player-other :deep(.tile--small) {
  width: 28px;
  height: 40px;
}

.player-other :deep(.tile-img) {
  border-radius: 3px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)) brightness(1.08);
}

/* 对家门口牌：非暗杠的牌旋转 180° 让牌面朝我方 */
.meld-lane--top :deep(.top-exposed-tile) {
  transform: rotate(180deg);
}

/* ---- 左家 / 右家旋转 ---- */
.hand-lane--left,
.meld-lane--left,
.flower-lane--left {
  transform: rotate(90deg);
  transform-origin: center;
}

.hand-lane--left {
  margin-bottom: 8px;
}

.meld-lane--left {
  margin-top: 8px;
}

.hand-lane--right,
.meld-lane--right,
.flower-lane--right {
  transform: rotate(-90deg);
  transform-origin: center;
}

.hand-lane--right {
  margin-top: 12px;
  position: relative;
  z-index: 1;
}

.meld-lane--right {
  margin-bottom: 28px;
  position: relative;
  z-index: 2;
}

/* ---- 摸牌高亮（复用 MahjongTile 内置样式） ---- */
/* tile--just-drawn 已在 MahjongTile.vue 中定义，此处无需额外样式 */
</style>
