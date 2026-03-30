<template>
  <div class="dice-scene" :style="delayStyle">
    <div
      class="dice-cube"
      :class="[
        `dice-cube--${state}`,
        state === 'landed' ? `dice-cube--show${value}` : '',
      ]"
    >
      <!-- 1: front -->
      <div class="dice-face dice-face--front">
        <div class="dot" v-for="d in DOT_LAYOUTS[1]" :key="d" :class="`dot--${d}`" />
      </div>
      <!-- 2: back -->
      <div class="dice-face dice-face--back">
        <div class="dot" v-for="d in DOT_LAYOUTS[2]" :key="d" :class="`dot--${d}`" />
      </div>
      <!-- 3: right -->
      <div class="dice-face dice-face--right">
        <div class="dot" v-for="d in DOT_LAYOUTS[3]" :key="d" :class="`dot--${d}`" />
      </div>
      <!-- 4: left -->
      <div class="dice-face dice-face--left">
        <div class="dot" v-for="d in DOT_LAYOUTS[4]" :key="d" :class="`dot--${d}`" />
      </div>
      <!-- 5: top -->
      <div class="dice-face dice-face--top">
        <div class="dot" v-for="d in DOT_LAYOUTS[5]" :key="d" :class="`dot--${d}`" />
      </div>
      <!-- 6: bottom -->
      <div class="dice-face dice-face--bottom">
        <div class="dot" v-for="d in DOT_LAYOUTS[6]" :key="d" :class="`dot--${d}`" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  value: number
  state: 'idle' | 'rolling' | 'landed'
  delay?: number
}>()

// 每面的骰子点布局
const DOT_LAYOUTS: Record<number, string[]> = {
  1: ['center'],
  2: ['tl', 'br'],
  3: ['tl', 'center', 'br'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'center', 'bl', 'br'],
  6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
}

const delayStyle = computed(() =>
  props.delay ? { animationDelay: `${props.delay}s` } : {}
)
</script>

<style scoped>
/* 外层 scene：提供 perspective */
.dice-scene {
  width: 80px;
  height: 80px;
  perspective: 500px;
  perspective-origin: 50% 50%;
  transform-style: preserve-3d;
}

/* 立方体 */
.dice-cube {
  width: 80px;
  height: 80px;
  position: relative;
  transform-style: preserve-3d;
  transform: translateZ(-40px);
  will-change: transform;
}

/* 每一面 */
.dice-face {
  position: absolute;
  width: 72px;
  height: 72px;
  border-radius: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  padding: 10px;
  box-sizing: border-box;
  backface-visibility: hidden;
}

/* 6面颜色不同，模拟真实骰子的光影 */
.dice-face--front  { transform: rotateY(0deg)   translateZ(40px); background: linear-gradient(135deg, #fffcf0 0%, #f5ead0 50%, #e8dcc0 100%); border: 1px solid rgba(180,160,120,0.4); box-shadow: inset 0 1px 3px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.1); }
.dice-face--back   { transform: rotateY(180deg) translateZ(40px); background: linear-gradient(135deg, #f0e8d0 0%, #e0d4b8 50%, #d4c8a8 100%); border: 1px solid rgba(160,140,100,0.4); box-shadow: inset 0 1px 2px rgba(255,255,255,0.4); }
.dice-face--right  { transform: rotateY(90deg)  translateZ(40px); background: linear-gradient(135deg, #f8f0d8 0%, #e8dcc0 50%, #dcd0a8 100%); border: 1px solid rgba(170,150,110,0.4); box-shadow: inset -1px 0 2px rgba(255,255,255,0.5); }
.dice-face--left   { transform: rotateY(-90deg) translateZ(40px); background: linear-gradient(135deg, #fff8e0 0%, #f0e4c8 50%, #e4d8b0 100%); border: 1px solid rgba(170,150,110,0.4); box-shadow: inset 1px 0 2px rgba(255,255,255,0.5); }
.dice-face--top    { transform: rotateX(90deg)  translateZ(40px); background: linear-gradient(135deg, #fffff0 0%, #faf4e0 50%, #f0e8d0 100%); border: 1px solid rgba(180,160,120,0.35); box-shadow: inset 0 1px 3px rgba(255,255,255,0.7); }
.dice-face--bottom { transform: rotateX(-90deg) translateZ(40px); background: linear-gradient(135deg, #e8e0c8 0%, #d8d0b8 50%, #c8c0a8 100%); border: 1px solid rgba(150,130,90,0.4); }

/* 骰子点 */
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #444, #111);
  box-shadow:
    inset 0 1px 2px rgba(255,255,255,0.25),
    0 1px 2px rgba(0,0,0,0.45);
}
.dot--center { grid-area: 2/2/3/3; justify-self: center; align-self: center; }
.dot--tl     { grid-area: 1/1/2/2; justify-self: start; align-self: start; }
.dot--tr     { grid-area: 1/3/2/4; justify-self: end; align-self: start; }
.dot--ml     { grid-area: 2/1/3/2; justify-self: start; align-self: center; }
.dot--mr     { grid-area: 2/3/3/4; justify-self: end; align-self: center; }
.dot--bl     { grid-area: 3/1/4/2; justify-self: start; align-self: end; }
.dot--br     { grid-area: 3/3/4/4; justify-self: end; align-self: end; }

/* ===== Idle: 悬浮慢转 ===== */
.dice-cube--idle {
  animation: idle-spin 4s linear infinite;
  opacity: 0.65;
}
@keyframes idle-spin {
  0%   { transform: translateZ(-40px) rotateX(20deg) rotateY(0deg); }
  100% { transform: translateZ(-40px) rotateX(20deg) rotateY(360deg); }
}

/* ===== Rolling: 抛起旋转落地 ===== */
.dice-cube--rolling {
  animation: dice-throw 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}
@keyframes dice-throw {
  0%   { transform: translateZ(-40px) translateY(-200px) rotateX(0deg)   rotateY(0deg)   rotateZ(0deg)   scale(0.5); opacity: 0; }
  5%   { opacity: 1; }
  20%  { transform: translateZ(-40px) translateY(0)      rotateX(270deg) rotateY(180deg) rotateZ(90deg)  scale(1.08); }
  35%  { transform: translateZ(-40px) translateY(-90px)  rotateX(540deg) rotateY(360deg) rotateZ(180deg) scale(0.95); }
  50%  { transform: translateZ(-40px) translateY(0)      rotateX(810deg) rotateY(540deg) rotateZ(270deg) scale(1.04); }
  62%  { transform: translateZ(-40px) translateY(-35px)  rotateX(990deg) rotateY(660deg) rotateZ(330deg) scale(0.98); }
  72%  { transform: translateZ(-40px) translateY(0)      rotateX(1080deg) rotateY(720deg) rotateZ(360deg) scale(1.02); }
  82%  { transform: translateZ(-40px) translateY(-10px)  rotateX(1110deg) rotateY(740deg) rotateZ(370deg) scale(0.99); }
  90%  { transform: translateZ(-40px) translateY(0)      rotateX(1125deg) rotateY(750deg) rotateZ(375deg) scale(1.01); }
  100% { transform: translateZ(-40px) translateY(0)      rotateX(0deg)   rotateY(0deg)   rotateZ(0deg)   scale(1); }
}

/* ===== Landed: 定格在正确的面 ===== */
.dice-cube--landed {
  animation: dice-land 0.3s ease-out;
}
/* 每个值对应不同旋转角度，让正确的面朝前 */
.dice-cube--show1 { transform: translateZ(-40px) rotateX(0deg)   rotateY(0deg); }
.dice-cube--show2 { transform: translateZ(-40px) rotateX(0deg)   rotateY(180deg); }
.dice-cube--show3 { transform: translateZ(-40px) rotateY(-90deg); }
.dice-cube--show4 { transform: translateZ(-40px) rotateY(90deg); }
.dice-cube--show5 { transform: translateZ(-40px) rotateX(-90deg); }
.dice-cube--show6 { transform: translateZ(-40px) rotateX(90deg); }

@keyframes dice-land {
  0%   { transform: translateZ(-40px) scale(1.12); }
  50%  { transform: translateZ(-40px) scale(0.93); }
  75%  { transform: translateZ(-40px) scale(1.04); }
  100% { transform: translateZ(-40px) scale(1); }
}
</style>
