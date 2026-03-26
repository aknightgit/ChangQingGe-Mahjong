<template>
  <!--
    菱形牌墙：四边围绕牌桌中央形成菱形
    - 容器旋转45度成为菱形
    - 四边各有18张扁平牌（宽>高，显示2.5D厚度）
    - 长边相连，形成完整环形
  -->
  <div class="tile-wall">
    <!-- 菱形容器：旋转45度 -->
    <div class="diamond-ring">
      <!-- 上边墙：水平排列，左→右 -->
      <div class="wall-segment wall-top">
        <div
          v-for="i in TOWERS"
          :key="`t-${i}`"
          class="flat-tile"
        />
      </div>

      <!-- 右边墙：垂直排列，上→下 -->
      <div class="wall-segment wall-right">
        <div
          v-for="i in TOWERS"
          :key="`r-${i}`"
          class="flat-tile rotated"
        />
      </div>

      <!-- 下边墙：水平排列，右→左 -->
      <div class="wall-segment wall-bottom">
        <div
          v-for="i in TOWERS"
          :key="`b-${i}`"
          class="flat-tile"
        />
      </div>

      <!-- 左边墙：垂直排列，下→上 -->
      <div class="wall-segment wall-left">
        <div
          v-for="i in TOWERS"
          :key="`l-${i}`"
          class="flat-tile rotated"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const TOWERS = 18
</script>

<style scoped>
.tile-wall {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 菱形容器：旋转45度 */
.diamond-ring {
  position: relative;
  width: 100%;
  height: 100%;
  transform: rotate(0deg); /* 牌桌是正的，不需要旋转 */
}

/* ===== 4个边墙：绝对定位围绕中心 ===== */
.wall-segment {
  position: absolute;
  display: flex;
  gap: 0;
}

/* 上边：水平，贴顶部 */
.wall-top {
  top: 8%;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row;
}

/* 下边：水平，贴底部，反向排列 */
.wall-bottom {
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row-reverse;
}

/* 左边：垂直，贴左侧 */
.wall-left {
  left: 8%;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column-reverse;
}

/* 右边：垂直，贴右侧 */
.wall-right {
  right: 8%;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
}

/* ===== 扁平牌：宽>高，2.5D厚度效果 ===== */
.flat-tile {
  /* 扁平矩形：宽>高，模拟从上方俯视的牌面 */
  width: 28px;
  height: 18px;
  border-radius: 3px;
  flex-shrink: 0;

  /* 2.5D 绿色牌面 */
  background: linear-gradient(
    160deg,
    #4aba7a 0%,
    #2e8b57 35%,
    #1a6b3d 65%,
    #0d4a28 100%
  );
  border: 0.5px solid rgba(255, 255, 255, 0.12);

  /* 顶部高光（厚度感） */
  box-shadow:
    /* 上边缘高光 */
    inset 0 1.5px 2px rgba(255, 255, 255, 0.28),
    /* 下边缘阴影 */
    inset 0 -1.5px 2px rgba(0, 0, 0, 0.25),
    /* 右边薄边 */
    inset 2px 0 1px rgba(255, 255, 255, 0.08),
    /* 整体投影 */
    0 2px 4px rgba(0, 0, 0, 0.35),
    0 4px 8px rgba(0, 0, 0, 0.15);
  position: relative;
}

/* 垂直边的牌：旋转90度 */
.flat-tile.rotated {
  width: 18px;
  height: 28px;
}

/* ===== 响应式缩小 ===== */
@media (max-width: 1300px) {
  .flat-tile {
    width: 22px;
    height: 14px;
  }
  .flat-tile.rotated {
    width: 14px;
    height: 22px;
  }
}

@media (max-width: 900px) {
  .flat-tile {
    width: 16px;
    height: 10px;
  }
  .flat-tile.rotated {
    width: 10px;
    height: 16px;
  }
}
</style>
