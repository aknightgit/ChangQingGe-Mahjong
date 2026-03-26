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

  /* 2.5D 深森林绿牌背：参考截图的暗绿调 */
  background:
    /* 浅绿圆点纹路层（斜向点阵） */
    radial-gradient(circle at 30% 30%, rgba(60,140,80,0.35) 0%, transparent 35%),
    radial-gradient(circle at 70% 60%, rgba(60,140,80,0.25) 0%, transparent 30%),
    radial-gradient(circle at 50% 80%, rgba(60,140,80,0.2) 0%, transparent 25%),
    /* 底色：从深绿到次深绿 */
    linear-gradient(
      160deg,
      #1a4a2a 0%,
      #0f3320 25%,
      #0a2820 55%,
      #061a12 100%
    );
  border: 0.5px solid rgba(80, 180, 100, 0.2);

  /* 2.5D 厚度感：顶部高光 + 底部暗角 + 投影 */
  box-shadow:
    /* 顶部强高光（光泽感） */
    inset 0 2px 3px rgba(100, 220, 140, 0.25),
    inset 0 1px 1px rgba(150, 255, 180, 0.15),
    /* 底部暗角（厚度感） */
    inset 0 -3px 4px rgba(0, 0, 0, 0.5),
    inset -1px 0 1px rgba(0, 0, 0, 0.2),
    inset 1px 0 1px rgba(0, 0, 0, 0.2),
    /* 整体投影 */
    0 3px 6px rgba(0, 0, 0, 0.5),
    0 6px 12px rgba(0, 0, 0, 0.25);
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
    width: 24px;
    height: 15px;
  }
  .flat-tile.rotated {
    width: 15px;
    height: 24px;
  }
}

@media (max-width: 900px) {
  .flat-tile {
    width: 18px;
    height: 11px;
  }
  .flat-tile.rotated {
    width: 11px;
    height: 18px;
  }
}
</style>
