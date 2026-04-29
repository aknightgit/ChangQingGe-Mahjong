<template>
  <!-- SOFT GUARD: self hand/meld rendering is user-validated.
       Any future edits to hand size, spacing, ordering, direction, or meld placement
       should be treated as high risk and require explicit user approval before changing. -->
  <div class="player-area" :class="{ 'player-area--winner': isWinner }">
    <!-- 玩家头像 -->
    <div class="self-player-header">
      <PlayerAvatar :name="name" class="self-avatar" :is-active="false" />
      <span class="self-player-name">
        {{ name }}
        <span v-if="isWinner" class="winner-tag">胡</span>
      </span>
    </div>

    <!-- 互包警告 -->
    <div v-if="bailoutCounts && Object.keys(bailoutCounts).length" class="bailout-warning">
      ⚠️ 互包:
      <span v-for="(count, playerId) in bailoutCounts" :key="playerId">
        <span class="player-dot" :style="{ background: colors[getPlayerIndex(playerId)] }" />
        ×{{ count }}
        <span v-if="count >= 3">🔥</span>
      </span>
    </div>

    <!-- 主区域：melds左 + 手牌右（含出牌区 overlay） -->
    <div class="player-main-row">
      <!-- 门口牌：左侧 -->
      <div class="player-flowers" v-if="flowerMelds.length">
        <div
          v-for="(meld, i) in flowerMelds"
          :key="`flower-${i}`"
          class="meld meld--flower"
        >
          <MahjongTile
            v-for="tile in meld.tiles"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="false"
            :back-scheme="-1"
            :dimmed="isWinner"
          />
        </div>
      </div>

      <div class="player-melds" v-if="mainMelds.length">
        <div
          v-for="(meld, i) in mainMelds"
          :key="i"
          class="meld"
          :class="[`meld--${meld.type}`, { 'meld--concealed': meld.type === 'concealed_kong' }]"
        >
          <MahjongTile
            v-for="tile in meld.tiles"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="isConcealedMeld(meld)"
            :back-scheme="isConcealedMeld(meld) ? (tileBackScheme ?? 0) : -1"
            :class="getClaimMarkerClass(meld, tile)"
            :style="getClaimMarkerStyle(meld)"
            :dimmed="isWinner"
          />
          <!-- 吃碰杠箭头指示来源 -->
          <span
            v-if="meld.sourcePosition !== undefined"
            class="meld-arrow"
            :class="[getSourceArrowClass(meld.sourcePosition, playerPosition)]"
            :style="getSourceBadgeStyle(meld.sourcePosition)"
          ></span>
          <!-- 兼容旧字段 sourceIndex -->
          <span
            v-else-if="(meld as any).sourceIndex !== undefined"
            class="meld-source"
            :style="{ background: colors[(meld as any).sourceIndex] }"
          />
        </div>
      </div>

      <!-- 手牌 + 出牌区 overlay -->
      <div class="player-hand-wrapper">
        <!-- 手牌 -->
        <div class="player-hand">
          <MahjongTile
            v-for="tile in sortedHand"
            :key="tile.id"
            :tile="tile"
            :selected="selectedTileId === tile.id"
            :just-drawn="justDrawnTileId === tile.id"
            :claim-highlight="claimCandidateIds?.includes(tile.id)"
            :dimmed="isWinner"
            @click="onTileClick(tile)"
            @dblclick="onTileDblclick(tile)"
            @pointerdown="onPointerDown($event, tile)"
            @pointerup="onPointerUp($event)"
            @pointercancel="onPointerCancel"
          />
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import PlayerAvatar from './PlayerAvatar.vue'
import type { Tile, Meld } from '~/types/game'

const props = defineProps<{
  name?: string
  hand: Tile[]
  melds: Meld[]
  tileBackScheme?: number
  selectedTileId?: string | null
  isWinner?: boolean
  justDrawnTileId?: string | null
  claimCandidateIds?: string[]
  bailoutCounts?: Record<string, number>
  playerColors?: string[]
  playerPosition?: number
}>()

// 直接使用后端传来的排序，不再前端重排
const sortedHand = computed(() => props.hand)

const colors = computed(() => props.playerColors || ['#e53935', '#43a047', '#1e88e5', '#fb8c00'])

const isFlowerMeld = (meld: Meld): boolean => {
  return meld.tiles.some(t => t.suit === 'hua' || t.isFlower)
}

const orderedMelds = computed(() => {
  const flowerMelds = props.melds.filter(meld => isFlowerMeld(meld))
  const mainMelds = props.melds.filter(meld => !isFlowerMeld(meld))
  return [...flowerMelds, ...mainMelds]
})

const flowerMelds = computed(() => orderedMelds.value.filter(meld => isFlowerMeld(meld)))
const mainMelds = computed(() => orderedMelds.value.filter(meld => !isFlowerMeld(meld)))

const isConcealedMeld = (meld: Meld): boolean => {
  return meld.type === 'concealed_kong' || !!(meld as any).isConcealed
}

// 吃碰箭头：后端传来的是来源玩家 absolute position，需要换算成“相对当前观察者”的方向
// relativePos: 0=自己(极少), 1=下家(右), 2=对家(上), 3=上家(左)
function getRelativeSourcePosition(sourcePosition: number, myPosition?: number): number {
  const observerPos = myPosition ?? 0
  return (sourcePosition - observerPos + 4) % 4
}

function getSourceLabel(sourcePosition: number, myPosition?: number): string {
  const relativePos = getRelativeSourcePosition(sourcePosition, myPosition)
  const labels = ['自', '下', '对', '上']
  return labels[relativePos] || '?'
}

// 箭头颜色 class：按相对方向区分
function getSourceArrowClass(sourcePosition: number, myPosition?: number): string {
  const relativePos = getRelativeSourcePosition(sourcePosition, myPosition)
  const classes = ['meld-arrow--self', 'meld-arrow--lower', 'meld-arrow--opposite', 'meld-arrow--upper']
  return classes[relativePos] || ''
}

function getSourceBadgeStyle(sourcePosition: number): Record<string, string> {
  return {
    backgroundColor: colors.value[sourcePosition] || '#757575',
    color: '#fff',
  }
}

function getClaimMarkerClass(meld: Meld, tile: Tile): string[] {
  if (!meld.sourceTileId || meld.sourceTileId !== tile.id || meld.type === 'concealed_kong') return []
  const tone = meld.sourcePosition !== undefined ? getSourceArrowClass(meld.sourcePosition, props.playerPosition) : 'meld-arrow--self'
  return ['claimed-tile', tone.replace('meld-arrow', 'claimed-tile')]
}

function getClaimMarkerStyle(meld: Meld): Record<string, string> {
  return meld.sourcePosition !== undefined
    ? { '--claim-source-color': colors.value[meld.sourcePosition] || '#757575' }
    : {}
}

// 弃牌区每行6张，自动换行（由CSS flex-wrap处理，无需computed）
function getPlayerIndex(playerId: string): number {
  let hash = 0
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash) + playerId.charCodeAt(i)
  }
  return Math.abs(hash) % 4
}

const emit = defineEmits<{
  (e: 'tileClick', tile: Tile): void
  (e: 'tileDblclick', tile: Tile): void
  (e: 'tileDiscard', tile: Tile): void
}>()

const confirmClaim = () => {
  // Claim logic handled by parent via availableActions
  // This button is part of the claim overlay (unused in current flow)
}

const skipClaim = () => {
  // Skip claim - parent handles via pass action
}

const onTileClick = (tile: Tile) => {
  emit('tileClick', tile)
}

const onTileDblclick = (tile: Tile) => {
  emit('tileDblclick', tile)
}

// ===== 拖拽出牌（pointer 事件 + 距离阈值） =====
const DRAG_THRESHOLD = 15 // px
let pointerStart: { x: number; y: number; tile: Tile } | null = null

const onPointerDown = (event: PointerEvent, tile: Tile) => {
  if (props.isWinner) return
  pointerStart = { x: event.clientX, y: event.clientY, tile }
}

const onPointerUp = (event: PointerEvent) => {
  if (!pointerStart) return
  const dx = event.clientX - pointerStart.x
  const dy = event.clientY - pointerStart.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const tile = pointerStart.tile
  pointerStart = null

  if (dist >= DRAG_THRESHOLD) {
    // 拖拽超过阈值 → 出牌
    emit('tileDiscard', tile)
  }
  // 距离 < 阈值 → 不做任何事（正常 click 事件会处理）
}

const onPointerCancel = () => {
  pointerStart = null
}
</script>

<style scoped>
.player-area {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 10px 6px;
  border-radius: 14px;
  background: transparent;
  width: 100%;
  bottom: 0;
}

.player-area--winner {
  background: transparent;
}

/* 自家玩家头像区域 */
.self-player-header {
  display: none;
}

.self-avatar {
  width: 40px;
  height: 40px;
}

.self-player-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: #f5f5f5;
  display: none; /* 头像已替代名字 */
}

.winner-tag {
  margin-left: 3px;
  padding: 0 3px;
  border-radius: 999px;
  background: #f44336;
  color: #fff;
  font-size: 0.6rem;
}

/* 主行：melds 左 + 手牌右（统一容器，统一裁剪） */
.player-main-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  /* P0 FIX: 统一裁剪 — 手牌区和门口牌区共同受该容器约束 */
  overflow: visible;
  max-width: 100%;
}


.player-melds {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 50px;
  /* P0 FIX: 门口牌受容器裁剪 */
  flex-shrink: 0;
  overflow: visible;
  z-index: 2;
}

.player-flowers {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 50px;
  flex-shrink: 0;
  overflow: visible;
  position: relative;
  z-index: 1;
}

.meld {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 4px 6px;
  padding-top: 16px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* 花牌 meld：无边框 */
.meld--flower {
  border-color: transparent !important;
  background: transparent !important;
  padding: 0 1px 0 0;
  gap: 1px;
}

.meld--flower + .meld--flower {
  margin-left: -7px;
}

/* 暗杠 meld：紫色边框 + 背景 */
.meld--concealed {
  border-color: rgba(171, 71, 188, 0.45) !important;
  background: rgba(171, 71, 188, 0.08) !important;
}

.meld--kong {
  box-shadow: 0 0 10px rgba(255, 214, 0, 0.4);
}

/* hand + claim overlay */
.player-hand-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  /* P0 FIX: 手牌区也受裁剪约束 */
  overflow: visible;
  z-index: 3;
}

.player-hand {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  justify-content: center;
  min-height: 82px;
  padding: 4px 2px 6px;
  border-radius: 10px;
  background: transparent;
  /* 限制最大宽度为14张牌，多余才换行 */
  max-width: none;
  width: fit-content;
  margin: 0 auto;
  gap: 2px;
}

.player-hand :deep(.tile) {
  cursor: pointer;
  margin: 0 0 2px 0;
  width: 34.1px;
  height: 49.5px;
}

.player-melds :deep(.tile) {
  width: 30.8px;
  height: 44px;
}

/* 玩家颜色圆点 */
.player-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid white;
  margin-right: 4px;
  vertical-align: middle;
}

/* 副露来源标记（旧兼容） */
.meld-source {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 2px;
  vertical-align: super;
  border: 1px solid rgba(255,255,255,0.5);
}

/* 吃碰来源箭头 */
.meld-arrow,
.meld-source {
  display: none;
}

.meld-arrow {
  position: absolute;
  top: -9px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 4px;
  color: #fff;
  white-space: nowrap;
}

/* 下家来源 = 蓝色 */
.meld-arrow--lower {
  background: #1e88e5;
}

/* 对家来源 = 绿色 */
.meld-arrow--opposite {
  background: #43a047;
}

/* 上家来源 = 红色 */
.meld-arrow--upper {
  background: #e53935;
}

:deep(.claimed-tile) {
  position: relative;
  overflow: visible !important;
}

:deep(.claimed-tile)::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 20px solid var(--claim-source-color, rgba(255,255,255,0.95));
  filter: drop-shadow(0 0 3px rgba(0,0,0,0.42));
  z-index: 4;
}

:deep(.claimed-tile--lower)::after { transform: translateX(-50%) rotate(-90deg); }
:deep(.claimed-tile--opposite)::after { transform: translateX(-50%) rotate(180deg); }
:deep(.claimed-tile--upper)::after { transform: translateX(-50%) rotate(90deg); }

/* 自摸 = 灰色 */
.meld-arrow--self {
  background: #757575;
}

/* 互包警告 */
.bailout-warning {
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid #ff9800;
  border-radius: 6px;
  padding: 4px 8px;
  margin: 4px 0;
  font-size: 0.75rem;
  color: #ffb74d;
  text-align: center;
}

/* 口数显示 */
.bailout-count {
  font-size: 0.7rem;
  color: #ffb74d;
  margin-left: 4px;
}


</style>
