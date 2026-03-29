<template>
  <div class="table-center-zone">
    <!-- 牌墙：双层2.5D效果 -->
    <TileWall :remaining="remainingTiles" />

    <!-- 中心信息：总倍数 + 剩余牌数 -->
    <div class="center-info">
      <div class="center-badges">
        <span class="multiplier-badge">
          🎲 总倍 ×{{ globalMultiplier || 1 }}
        </span>
        <span class="remaining-badge">
          🀄 剩余 {{ remainingTiles }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from './MahjongTile.vue'
import TileWall from './TileWall.vue'
import type { Tile } from '~/types/game'

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

const wildTileName = computed(() => {
  if (!props.wildTile) return ''
  if (props.wildTile.suit === 'hua') {
    return FLOWER_NAMES[props.wildTile.value] || `花${props.wildTile.value}`
  }
  return ''
})
</script>

<style scoped>
.table-center-zone {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  pointer-events: none;
}

/* 牌墙 */
.tile-wall { opacity: 0.85; pointer-events: none; }

/* 中心信息 - 只显示倍数/百搭 */
.center-info {
  text-align: center;
  pointer-events: auto;
}

.center-badges {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.multiplier-badge {
  background: rgba(255, 152, 0, 0.92);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.38);
}

.remaining-badge {
  background: rgba(0, 120, 80, 0.85);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0, 120, 80, 0.35);
}
</style>
