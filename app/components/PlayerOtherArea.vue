<!--
  PlayerOtherArea - P0 重构版 v2

  布局规则（从玩家视角顺时针方向，从外向内）：
    - 对家(top):   手牌在外侧(上/远离桌心)  门口牌在内侧(下/靠近桌心)  → unified-col 上下排列
    - 左家(left):  手牌在外侧(左/远离桌心)  门口牌在内侧(右/靠近桌心)  → 整体 rotate90°
    - 右家(right): 手牌在外侧(右/远离桌心)  门口牌在内侧(左/靠近桌心)  → 整体 rotate-90°

  关键原则：整体旋转 > 单牌旋转
-->
<template>
  <div
    class="player-other"
    :class="`player-other--${position}`"
    :style="containerStyle"
  >
    <!-- ====== 对家（上方）====== -->
    <template v-if="position === 'top'">
      <div class="unified-col">
        <!-- 手牌行（外侧/上/远离桌心） -->
        <div v-if="hand.length" class="hand-row hand-row--top">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :dimmed="isWinner"
          />
        </div>
        <!-- 门口牌行（内侧/下/靠近桌心） -->
        <div v-if="melds.length" class="meld-row meld-row--top">
          <div
            v-for="(m, i) in melds"
            :key="i"
            class="meld-group meld-segment"
            :class="{ 'meld-group--kong': m.type === 'kong' }"
          >
            <MahjongTile
              v-for="t in m.tiles"
              :key="t.id"
              :tile="t"
              :small="true"
              :back="isConcealedMeld(m)"
              :dimmed="isWinner"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ====== 左家（左侧）====== -->
    <template v-else-if="position === 'left'">
      <div class="unified-col">
        <!-- 手牌（外侧 = 远离桌心 = 牌堆的远端） -->
        <div v-if="hand.length" class="hand-zone">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :dimmed="isWinner"
          />
        </div>
        <!-- 门口牌（内侧 = 靠近桌心） -->
        <div v-if="melds.length" class="meld-zone">
          <div
            v-for="(m, i) in melds"
            :key="i"
            class="meld-group meld-segment"
            :class="{ 'meld-group--kong': m.type === 'kong' }"
          >
            <MahjongTile
              v-for="t in m.tiles"
              :key="t.id"
              :tile="t"
              :small="true"
              :back="isConcealedMeld(m)"
              :dimmed="isWinner"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ====== 右家（右侧）====== -->
    <template v-else>
      <div class="unified-col">
        <!-- 门口牌（内侧 = 靠近桌心）— 顺序与左家相反 -->
        <div v-if="melds.length" class="meld-zone">
          <div
            v-for="(m, i) in melds"
            :key="i"
            class="meld-group meld-segment"
            :class="{ 'meld-group--kong': m.type === 'kong' }"
          >
            <MahjongTile
              v-for="t in m.tiles"
              :key="t.id"
              :tile="t"
              :small="true"
              :back="isConcealedMeld(m)"
              :dimmed="isWinner"
            />
          </div>
        </div>
        <!-- 手牌（外侧 = 远离桌心 = 牌堆的远端）— 顺序与左家相反 -->
        <div v-if="hand.length" class="hand-zone">
          <MahjongTile
            v-for="tile in hand"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :back="true"
            :dimmed="isWinner"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import type { Meld } from '~/types/game'

const props = defineProps<{
  position: 'top' | 'left' | 'right'
  hand: any[]
  melds: Meld[]
  isWinner?: boolean
}>()

const seatKey = computed(() => {
  return props.position === 'top' ? 'opp' : props.position
})

function cssVar(variableName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = document.documentElement.style.getPropertyValue(variableName).trim()
  return v !== '' ? v : fallback
}

function cssVarNum(variableName: string, fallback: number): number {
  const v = cssVar(variableName, String(fallback))
  return Number(v) || fallback
}

// ---- 唯一控制变量：reverse ----
const reverse = computed(() => cssVarNum(`--${seatKey.value}-reverse`, 0))

// ---- 间距 ----
const handGap = computed(() => cssVarNum(`--${seatKey.value}-hand-gap`, 2))
const meldGap = computed(() => cssVarNum(`--${seatKey.value}-meld-gap`, 3))

// ---- 容器尺寸 ----
const containerWidth = computed(() => {
  return props.position === 'top' ? 'var(--opp-container-w, 66%)' :
         props.position === 'left' ? 'var(--left-container-w, 85px)' :
         'var(--right-container-w, 85px)'
})

// ---- 容器样式 ----
const containerStyle = computed(() => {
  const base: Record<string, string> = {
    position: 'relative',
    flexShrink: '0',
    flexGrow: '0',
    overflow: 'hidden',
    width: containerWidth.value,
  }
  // 左家整体旋转90°，右家整体旋转-90°
  if (props.position === 'left') {
    base['transform'] = 'rotate(90deg)'
    base['transformOrigin'] = 'center center'
  } else if (props.position === 'right') {
    base['transform'] = 'rotate(-90deg)'
    base['transformOrigin'] = 'center center'
  }
  return base
})

// ---- 门口牌是否暗手 ----
const isConcealedMeld = (meld: Meld): boolean => {
  return meld.type === 'concealed_kong' || !!(meld as any).isConcealed
}
</script>

<style scoped>
/* ============================================================
   根容器：唯一设置 overflow: hidden 的地方
   ============================================================ */
.player-other {
  position: relative;
  flex-shrink: 0;
  flex-grow: 0;
  overflow: hidden;
}

/* ============================================================
   对家（上方）：column 布局，上下两行
   ============================================================ */
.unified-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-wrap: nowrap;
  flex-shrink: 0;
  width: fit-content;
  max-height: 100%;
}

.hand-row--top {
  display: flex;
  flex-direction: row;
  gap: v-bind('handGap + "px"');
  flex-shrink: 0;
  padding: 5px 0;
}

.meld-row--top {
  display: flex;
  flex-direction: row;
  gap: v-bind('meldGap + "px"');
  flex-shrink: 0;
  padding: 5px 0;
}

/* ============================================================
   左家/右家：unified-col 内部，flex column
   ============================================================ */
.hand-zone {
  display: flex;
  flex-direction: column;
  gap: v-bind('handGap + "px"');
  flex-shrink: 0;
}

.meld-zone {
  display: flex;
  flex-direction: column;
  gap: v-bind('meldGap + "px"');
  flex-shrink: 0;
}

/* ============================================================
   门口牌组（通用）
   ============================================================ */
.meld-group {
  display: inline-flex;
  flex-direction: row;
  gap: 1px;
  flex-shrink: 0;
  padding: 2px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
}

.meld-group--kong {
  box-shadow: 0 0 8px rgba(255, 214, 0, 0.4);
}
</style>
