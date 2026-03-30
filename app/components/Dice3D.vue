<template>
  <div
    class="dice3d"
    :class="[
      `dice3d--${state}`,
      state === 'landed' ? `dice3d--face${value}` : '',
    ]"
    :style="delayStyle"
  >
    <div class="dice3d-face dice3d-face--front">
      <template v-if="state !== 'rolling'" v-for="d in currentDots" :key="d">
        <div class="dot" :class="`dot--${d}`" />
      </template>
    </div>
    <div class="dice3d-face dice3d-face--back" />
    <div class="dice3d-face dice3d-face--right" />
    <div class="dice3d-face dice3d-face--left" />
    <div class="dice3d-face dice3d-face--top" />
    <div class="dice3d-face dice3d-face--bottom" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  value: number
  state: 'idle' | 'rolling' | 'landed'
  delay?: number
}>()

const DOT_LAYOUTS: Record<number, string[]> = {
  1: ['center'],
  2: ['tl', 'br'],
  3: ['tl', 'center', 'br'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'center', 'bl', 'br'],
  6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
}

const currentDots = computed(() => DOT_LAYOUTS[props.value] || ['center'])
const delayStyle = computed(() =>
  props.delay ? { animationDelay: `${props.delay}s` } : {}
)
</script>

<style scoped>
.dice3d {
  width: 96px;
  height: 96px;
  position: relative;
  transform-style: preserve-3d;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.5));
}

.dice3d-face {
  position: absolute;
  width: 96px;
  height: 96px;
  border-radius: 16px;
  border: 1.5px solid rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
  padding: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  backface-visibility: hidden;
}

/* 不同面不同的明暗度，增强立体感 */
.dice3d-face--front  { transform: translateZ(48px); background: linear-gradient(145deg, #fffefa, #f0e8d8); box-shadow: inset 0 2px 0 rgba(255,255,255,0.7); }
.dice3d-face--back   { transform: rotateY(180deg) translateZ(48px); background: linear-gradient(145deg, #e8e0d0, #d8d0c0); box-shadow: inset 0 1px 0 rgba(255,255,255,0.4); }
.dice3d-face--right  { transform: rotateY(90deg) translateZ(48px); background: linear-gradient(145deg, #f0ead8, #e0d8c8); box-shadow: inset -1px 0 0 rgba(255,255,255,0.5); }
.dice3d-face--left   { transform: rotateY(-90deg) translateZ(48px); background: linear-gradient(145deg, #f5efe0, #e5ddd0); box-shadow: inset 1px 0 0 rgba(255,255,255,0.5); }
.dice3d-face--top    { transform: rotateX(90deg) translateZ(48px); background: linear-gradient(145deg, #fffff5, #f5f0e0); box-shadow: inset 0 1px 0 rgba(255,255,255,0.8); }
.dice3d-face--bottom { transform: rotateX(-90deg) translateZ(48px); background: linear-gradient(145deg, #d8d0c0, #c8c0b0); }

/* 点 */
.dot {
  width: 16px;
  height: 16px;
  background: radial-gradient(circle at 38% 32%, #333, #0a0a0a);
  border-radius: 50%;
  box-shadow: inset 0 1px 3px rgba(255, 255, 255, 0.2), 0 2px 3px rgba(0, 0, 0, 0.4);
}

.dot--center { grid-area: 2/2/3/3; justify-self: center; align-self: center; }
.dot--tl     { grid-area: 1/1/2/2; justify-self: start; align-self: start; }
.dot--tr     { grid-area: 1/3/2/4; justify-self: end; align-self: start; }
.dot--ml     { grid-area: 2/1/3/2; justify-self: start; align-self: center; }
.dot--mr     { grid-area: 2/3/3/4; justify-self: end; align-self: center; }
.dot--bl     { grid-area: 3/1/4/2; justify-self: start; align-self: end; }
.dot--br     { grid-area: 3/3/4/4; justify-self: end; align-self: end; }

/* ===== Idle: 浮动等待 + 慢转 ===== */
.dice3d--idle {
  opacity: 0.6;
  animation: idle-float 3s ease-in-out infinite;
}

@keyframes idle-float {
  0%, 100% { transform: rotateX(-20deg) rotateY(-25deg) rotateZ(5deg) translateY(0); }
  50% { transform: rotateX(-20deg) rotateY(-25deg) rotateZ(5deg) translateY(-12px); }
}

/* ===== Rolling: 0.8s 立体滚动+跳跃 ===== */
.dice3d--rolling {
  animation: dice-roll-jump 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes dice-roll-jump {
  0% {
    transform: translateY(-180px) translateX(-30px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(0.6);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  /* 第一次落地弹起 */
  20% {
    transform: translateY(0) rotateX(180deg) rotateY(120deg) rotateZ(60deg) scale(1.05);
  }
  /* 第一次弹跳 */
  35% {
    transform: translateY(-70px) rotateX(360deg) rotateY(270deg) rotateZ(150deg) scale(1);
  }
  /* 第二次落地 */
  48% {
    transform: translateY(0) rotateX(540deg) rotateY(400deg) rotateZ(240deg) scale(1.03);
  }
  /* 第二次弹跳（较小） */
  58% {
    transform: translateY(-28px) rotateX(660deg) rotateY(500deg) rotateZ(300deg) scale(0.98);
  }
  /* 第三次落地 */
  68% {
    transform: translateY(0) rotateX(780deg) rotateY(600deg) rotateZ(340deg) scale(1.02);
  }
  /* 微弹 */
  76% {
    transform: translateY(-8px) rotateX(840deg) rotateY(650deg) rotateZ(355deg) scale(0.99);
  }
  /* 稳定 */
  85% {
    transform: translateY(0) rotateX(900deg) rotateY(720deg) rotateZ(360deg) scale(1);
  }
  /* 轻微回弹 */
  92% {
    transform: translateY(-3px) rotateX(920deg) rotateY(735deg) rotateZ(365deg) scale(1.01);
  }
  100% {
    transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1);
    opacity: 1;
  }
}

/* ===== Landed: 落地定格 ===== */
.dice3d--landed {
  animation: dice-land-pop 0.35s ease-out;
}

@keyframes dice-land-pop {
  0% { transform: scale(1.15); }
  50% { transform: scale(0.94); }
  75% { transform: scale(1.03); }
  100% { transform: scale(1); }
}

/* 旋转到对应面 */
.dice3d--face1 { transform: rotateX(0deg) rotateY(0deg); }
.dice3d--face2 { transform: rotateY(-90deg); }
.dice3d--face3 { transform: rotateX(-90deg); }
.dice3d--face4 { transform: rotateX(90deg); }
.dice3d--face5 { transform: rotateY(90deg); }
.dice3d--face6 { transform: rotateY(180deg); }
</style>
