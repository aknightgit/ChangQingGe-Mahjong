<template>
  <div class="tile-wall" :class="`tile-wall--${layout}`">
    <div
      v-for="row in wallRows"
      :key="row.side"
      class="wall-row"
      :class="`wall-row--${row.side}`"
    >
      <div
        v-for="(tower, ti) in row.towers"
        :key="ti"
        class="wall-tower"
        :class="{
          'wall-tower--vertical': row.side === 'left' || row.side === 'right'
        }"
      >
        <div class="tower-tile" />
        <div class="tower-tile" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 牌墙组件 - 每边固定18剁（18组×2张=36张/边）
 * 每剁(tower) = 2张牌竖叠，长边相连
 */

const props = defineProps<{
  remaining: number
  layout?: 'diamond' | 'rect'
}>()

const layout = computed(() => props.layout || 'diamond')

// 每边固定18剁
const TOWERS_PER_SIDE = 18

const wallRows = computed(() => {
  const sides = ['top', 'right', 'bottom', 'left'] as const
  return sides.map((side, i) => ({
    side,
    towers: Array.from({ length: TOWERS_PER_SIDE }, (_, j) => j),
    offset: i * TOWERS_PER_SIDE
  }))
})
</script>

<style scoped>
.tile-wall {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.wall-row {
  position: absolute;
  display: flex;
  gap: 0;
}

/* ===== 上下：水平一整排，tower 长边(宽度)相连 ===== */
.wall-row--top {
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row;
  flex-wrap: nowrap;
}

.wall-row--bottom {
  bottom: 9%;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row-reverse;
  flex-wrap: nowrap;
}

/* ===== 左右：垂直一整排 ===== */
.wall-row--left {
  left: 10%;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
}

.wall-row--right {
  right: 10%;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column-reverse;
  flex-wrap: nowrap;
  align-items: center;
}

/* ===== 单剁：2张牌竖叠 ===== */
.wall-tower {
  display: flex;
  /* 水平墙：竖叠2张，长边(宽度)相连 */
  flex-direction: column;
  /* 2张牌之间无缝，长边相接 */
  gap: 0;
  flex-shrink: 0;
}

/* 左右墙：横叠2张（旋转90度后看起来是竖叠）*/
.wall-tower--vertical {
  flex-direction: row;
}

.tower-tile {
  /* 匹配小号手牌尺寸: 34×50px */
  width: 22px;
  height: 34px;
  border-radius: 2px;
  background: #1a6b3d;
  border: 0.5px solid #145a32;
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,0.18),
    inset 0 -1px 1px rgba(0,0,0,0.2),
    0 1px 2px rgba(0,0,0,0.25);
  position: relative;
  overflow: hidden;
  background: linear-gradient(155deg, #3da86a 0%, #2e8b57 30%, #1a6b3d 65%, #0d4a28 100%);
}

/* 2张牌之间无缝（长边相接）*/
/* 竖叠: 上张的底边贴着下张的顶边 */
.wall-tower .tower-tile + .tower-tile {
  margin-top: -0.5px;
}

/* 横叠: 左张的右边贴着右张的左边 */
.wall-tower--vertical .tower-tile + .tower-tile {
  margin-left: -0.5px;
}
</style>
