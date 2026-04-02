<template>
  <div class="table-center-zone">
    <!-- 中心信息区：垂直居中堆叠 -->
    <div class="center-info">
      <div class="info-item multiplier-badge">
        <span class="badge-icon">🎲</span>
        <span class="badge-label">总倍</span>
        <span class="badge-value">×{{ globalMultiplier || 1 }}</span>
      </div>
      <div class="info-item remaining-badge">
        <span class="badge-icon">🀄</span>
        <span class="badge-label">剩余</span>
        <span class="badge-value">{{ remainingTiles }}</span>
      </div>
      <!-- 百搭牌 -->
      <div v-if="wildTile" class="info-item wild-tile-row">
        <MahjongTile :tile="wildTile" :size="7" />
        <span class="wild-name">{{ wildTileName }}</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import { TileSuit } from '../types/game'
import type { Tile } from '../types/game'

const props = defineProps<{
  remainingTiles: number
  statusMessage: string
  hintMessage?: string
  isWinner?: boolean
  roundMultiplier?: number
  globalMultiplier?: number
  wildTile?: Tile | null
}>()

// 花牌中文名称
const FLOWER_NAMES: Record<number, string> = {
  1: '春', 2: '夏', 3: '秋', 4: '冬',
  5: '梅', 6: '兰', 7: '竹', 8: '菊',
}

// 风牌中文名称
const WIND_NAMES: Record<number, string> = {
  1: '东', 2: '南', 3: '西', 4: '北',
}

// 箭牌中文名称
const DRAGON_NAMES: Record<number, string> = {
  1: '中', 2: '发', 3: '白',
}

// 数字中文名称
const NUM_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

// 花色中文名称
const SUIT_NAMES: Record<string, string> = {
  [TileSuit.DOTS]: '筒',
  [TileSuit.CHARACTERS]: '万',
  [TileSuit.BAMBOOS]: '条',
}

// 获取牌的中文显示名称
function getTileDisplayName(tile: Tile): string {
  if (tile.suit === TileSuit.WIND) return WIND_NAMES[tile.value] || `风${tile.value}`
  if (tile.suit === TileSuit.DRAGON) return DRAGON_NAMES[tile.value] || `箭${tile.value}`
  if (tile.suit === TileSuit.FLOWER) return FLOWER_NAMES[tile.value] || `花${tile.value}`
  return `${NUM_NAMES[tile.value - 1]}${SUIT_NAMES[tile.suit]}`
}

const wildTileName = computed(() => {
  if (!props.wildTile) return ''
  if (props.wildTile.suit === TileSuit.FLOWER) {
    return FLOWER_NAMES[props.wildTile.value] || `花${props.wildTile.value}`
  }
  // 非花牌百搭：显示牌的中文名（不带"百搭"后缀）
  return getTileDisplayName(props.wildTile)
})
</script>

<style scoped>
.table-center-zone {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  pointer-events: none;
}

/* 侧边牌墙容器 */
.wall-side-container {
  flex: 0 0 auto;
  width: 80px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

/* 中心信息区：垂直居中 */
.center-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  pointer-events: auto;
  padding: 10px 20px;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 70%, transparent 100%);
  border-radius: 8px;
  min-width: 90px;
}

/* 信息项通用样式 */
.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
}

/* 倍数徽章 */
.multiplier-badge {
  background: transparent;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.5rem;
  font-weight: 800;
}

.multiplier-badge .badge-icon {
  font-size: 0.55rem;
}

.multiplier-badge .badge-value {
  font-size: 0.6rem;
  font-weight: 900;
}

/* 剩余牌数徽章 */
.remaining-badge {
  background: transparent;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.5rem;
  font-weight: 800;
}

.remaining-badge .badge-icon {
  font-size: 0.55rem;
}

.remaining-badge .badge-value {
  font-size: 0.6rem;
  font-weight: 900;
}

/* 百搭牌行 */
.wild-tile-row {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 152, 0, 0.15) 100%);
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.wild-name {
  color: #ffd54f;
  font-size: 0.5rem;
  font-weight: 800;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

/* 响应式 */
@media (max-width: 1100px) {
  .wall-side-container {
    width: 60px;
  }
  .center-info {
    padding: 16px 30px;
    min-width: 150px;
  }
  .multiplier-badge, .remaining-badge {
    padding: 6px 16px;
    font-size: 0.9rem;
  }
}

@media (max-width: 900px) {
  .wall-side-container {
    width: 45px;
  }
  .center-info {
    padding: 12px 24px;
    gap: 10px;
  }
  .multiplier-badge, .remaining-badge {
    padding: 5px 12px;
    font-size: 0.8rem;
  }
  .wild-tile-row {
    padding: 3px 6px;
  }
}
</style>
