<template>
  <!--
    牌墙组件 - 参考图布局
    - 四边菱形环绕：上右下左，各18张
    - 每张牌：真实牌面俯视角度，轻微2.5D厚度感
    - 长边相连，紧密排列
  -->
  <div class="tile-wall">
    <!-- 上边：左→右 -->
    <div class="wall-row wall-top">
      <div
        v-for="i in TOWERS"
        :key="`t-${i}`"
        class="tile-slot"
        :class="`tile-slot--top tile-slot--face-${getFace(i)}`"
        :style="topTileStyle(i)"
      >
        <img
          v-if="getFace(i) !== 'back'"
          :src="`/assets/tileset/pomax_hq/${getFace(i)}.png`"
          class="tile-img"
          alt=""
        />
        <div v-else class="tile-back" />
      </div>
    </div>

    <!-- 右边：上→下 -->
    <div class="wall-row wall-right">
      <div
        v-for="i in TOWERS"
        :key="`r-${i}`"
        class="tile-slot tile-slot--rotated"
        :class="`tile-slot--right tile-slot--face-${getFaceR(i)}`"
        :style="rightTileStyle(i)"
      >
        <img
          v-if="getFaceR(i) !== 'back'"
          :src="`/assets/tileset/pomax_hq/${getFaceR(i)}.png`"
          class="tile-img"
          alt=""
        />
        <div v-else class="tile-back" />
      </div>
    </div>

    <!-- 下边：右→左 -->
    <div class="wall-row wall-bottom">
      <div
        v-for="i in TOWERS"
        :key="`b-${i}`"
        class="tile-slot"
        :class="`tile-slot--bottom tile-slot--face-${getFaceB(i)}`"
        :style="bottomTileStyle(i)"
      >
        <img
          v-if="getFaceB(i) !== 'back'"
          :src="`/assets/tileset/pomax_hq/${getFaceB(i)}.png`"
          class="tile-img"
          alt=""
        />
        <div v-else class="tile-back" />
      </div>
    </div>

    <!-- 左边：下→上 -->
    <div class="wall-row wall-left">
      <div
        v-for="i in TOWERS"
        :key="`l-${i}`"
        class="tile-slot tile-slot--rotated"
        :class="`tile-slot--left tile-slot--face-${getFaceL(i)}`"
        :style="leftTileStyle(i)"
      >
        <img
          v-if="getFaceL(i) !== 'back'"
          :src="`/assets/tileset/pomax_hq/${getFaceL(i)}.png`"
          class="tile-img"
          alt=""
        />
        <div v-else class="tile-back" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 牌墙 - 参考图效果：真实牌面图，2.5D俯视堆叠
 * 四边环绕，每边18张，菱形布局
 */

const props = defineProps<{
  remaining: number
  layout?: 'diamond' | 'rect'
}>()

const TOWERS = 18

// 每边固定展示18张，用真实牌面图循环填充
const FACE_SEQUENCE = [
  'Man1','Pin1','Sou1','Man2','Pin2','Sou2','Man3','Pin3','Sou3',
  'Man4','Pin4','Sou4','Man5','Pin5','Sou5','Man6','Pin6','Sou6',
  'Man7','Pin7','Sou7','Man8','Pin8','Sou8','Man9','Pin9','Sou9',
  'East','South','West','North','Chun','Pei','Haku','Hatsu','Nan',
  'Orchid','Bamboo','Chrysanthemum','Autumn','Back'
]

function getFace(i: number) {
  return FACE_SEQUENCE[(i * 7) % FACE_SEQUENCE.length]
}
function getFaceR(i: number) {
  return FACE_SEQUENCE[(i * 11 + 3) % FACE_SEQUENCE.length]
}
function getFaceB(i: number) {
  return FACE_SEQUENCE[(i * 13 + 7) % FACE_SEQUENCE.length]
}
function getFaceL(i: number) {
  return FACE_SEQUENCE[(i * 17 + 11) % FACE_SEQUENCE.length]
}

// 上边：从左到右，俯视角度
function topTileStyle(i: number) {
  const overlap = 24 // 相邻牌重叠24px（牌宽28px - 4px可见）
  return {
    left: `calc(50% - ${(TOWERS * overlap) / 2}px + ${(i - 1) * overlap}px)`,
    top: '8%',
    transform: 'translateX(-50%)'
  }
}

// 下边：从右到左（row-reverse方向）
function bottomTileStyle(i: number) {
  const overlap = 24
  // i=1在最右边，i=TOWERS在最左边
  return {
    left: `calc(50% + ${(TOWERS * overlap) / 2}px - ${i * overlap}px)`,
    bottom: '8%',
    transform: 'translateX(-50%)'
  }
}

// 右边：从上到下，旋转90度
function rightTileStyle(i: number) {
  const overlap = 24
  return {
    right: `calc(8% + ${(i - 1) * overlap}px)`,
    top: '50%',
    transform: 'translateY(-50%)'
  }
}

// 左边：从下到上（column-reverse方向）
function leftTileStyle(i: number) {
  const overlap = 24
  return {
    left: `calc(8% + ${(i - 1) * overlap}px)`,
    bottom: '50%',
    transform: 'translateY(50%)'
  }
}
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
  width: 100%;
  height: 100%;
}

/* ===== 上边 ===== */
.wall-top {
  /* tiles positioned absolutely within */
}

/* ===== 下边 ===== */
.wall-bottom {
  /* tiles positioned absolutely within */
}

/* ===== 左边 ===== */
.wall-left {
  /* tiles positioned absolutely within */
}

/* ===== 右边 ===== */
.wall-right {
  /* tiles positioned absolutely within */
}

/* ===== 单张牌slot ===== */
.tile-slot {
  position: absolute;
  width: 28px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 旋转的牌（左右边）：旋转90度 */
.tile-slot--rotated {
  width: 38px;
  height: 28px;
}

.tile-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* 2.5D效果：轻微阴影+顶部高光 */
  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4))
          drop-shadow(0 2px 3px rgba(0,0,0,0.25));
  border-radius: 3px;
}

.tile-back {
  width: 100%;
  height: 100%;
  border-radius: 3px;
  background:
    /* 顶部光泽 */
    linear-gradient(180deg,
      rgba(255,255,255,0.2) 0%,
      transparent 40%,
      transparent 60%,
      rgba(0,0,0,0.3) 100%),
    /* 主体深绿 */
    linear-gradient(160deg,
      #2a6b3a 0%,
      #1a4a28 40%,
      #0d3320 70%,
      #061a10 100%);
  border: 0.5px solid rgba(180,220,160,0.15);
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,0.2),
    inset 0 -1px 2px rgba(0,0,0,0.3),
    0 1px 2px rgba(0,0,0,0.3);
}

/* ===== 俯视2.5D效果 ===== */
.tile-slot--top .tile-img,
.tile-slot--bottom .tile-img {
  /* 俯视：轻微顶部→底部渐变模拟厚度 */
  clip-path: polygon(0 4%, 100% 0, 100% 96%, 0 100%);
}

.tile-slot--rotated .tile-img {
  clip-path: polygon(4% 0, 100% 0, 96% 100%, 0 100%);
}

/* ===== 响应式 ===== */
@media (max-width: 1300px) {
  .tile-slot {
    width: 22px;
    height: 30px;
  }
  .tile-slot--rotated {
    width: 30px;
    height: 22px;
  }
}

@media (max-width: 900px) {
  .tile-slot {
    width: 16px;
    height: 22px;
  }
  .tile-slot--rotated {
    width: 22px;
    height: 16px;
  }
}
</style>
