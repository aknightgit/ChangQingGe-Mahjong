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
        :class="`wall-tower--${row.side}`"
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
 * 每剁(tower) = 2张牌竖叠（flex-direction: column），长边相连
 * 所有4边用同一套逻辑，左/右墙的牌旋转90°
 */

const props = defineProps<{
  remaining: number
  layout?: 'diamond' | 'rect'
}>()

const layout = computed(() => props.layout || 'diamond')

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

/* ===== 上下墙：towers 水平排列 ===== */
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

/* ===== 左右墙：towers 垂直排列 ===== */
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

/* ===== 所有 tower：统一 2张牌竖叠（column），gap: 0 ===== */
.wall-tower {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex-shrink: 0;
}

/* ===== 单张牌：与手牌 small 尺寸一致 ===== */
.tower-tile {
  width: 34px;
  height: 50px;
  border-radius: 3px;
  background: linear-gradient(155deg, #3da86a 0%, #2e8b57 30%, #1a6b3d 65%, #0d4a28 100%);
  border: 0.5px solid #145a32;
  box-shadow:
    inset 0 1px 2px rgba(255,255,255,0.25),
    inset 0 -2px 3px rgba(0,0,0,0.3),
    inset 2px 0 1px rgba(255,255,255,0.08),
    0 1px 3px rgba(0,0,0,0.3);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

/* ===== 上下墙：tower 内 2 张牌紧密叠放 ===== */
.wall-tower--top .tower-tile + .tower-tile,
.wall-tower--bottom .tower-tile + .tower-tile {
  margin-top: -1px;
}

/* ===== 左右墙：每张牌旋转 90°，使长边沿墙方向 ===== */
/* 34×50 旋转后视觉：50 宽 × 34 高。2张叠放需 margin 负值来无缝合并 */
.wall-tower--left .tower-tile,
.wall-tower--right .tower-tile {
  transform: rotate(90deg);
  margin-top: -17px;
  margin-bottom: -17px;
}

/* ===== 响应式 ===== */
@media (max-width: 1300px) {
  .tower-tile {
    width: 25px;
    height: 35px;
  }
  .wall-tower--left .tower-tile,
  .wall-tower--right .tower-tile {
    margin-top: -12px;
    margin-bottom: -12px;
  }
}

@media (max-width: 900px) {
  .tower-tile {
    width: 20px;
    height: 28px;
  }
  .wall-tower--left .tower-tile,
  .wall-tower--right .tower-tile {
    margin-top: -9px;
    margin-bottom: -9px;
  }
}
</style>
