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
  rollSeed?: number
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

const delayStyle = computed(() => ({
  ...(props.delay ? { animationDelay: `${props.delay}s` } : {}),
  ...(props.state === 'rolling'
    ? {
        '--spin-x': `${1080 + (props.rollSeed ?? 0) % 540}deg`,
        '--spin-y': `${1260 + ((props.rollSeed ?? 0) * 7) % 720}deg`,
        '--spin-z': `${720 + ((props.rollSeed ?? 0) * 11) % 540}deg`,
      }
    : {}),
}))
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

/* 经典红白麻将骰：红色骰面 + 白色点数 */
.dice-face--front  { transform: rotateY(0deg)   translateZ(40px); background: linear-gradient(135deg, #e53935 0%, #c62828 50%, #b71c1c 100%); border: 1px solid rgba(255,100,100,0.5); box-shadow: inset 0 1px 3px rgba(255,200,200,0.4), inset 0 -1px 2px rgba(0,0,0,0.2); }
.dice-face--back   { transform: rotateY(180deg) translateZ(40px); background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 50%, #a51515 100%); border: 1px solid rgba(230,80,80,0.5); box-shadow: inset 0 1px 2px rgba(255,180,180,0.3); }
.dice-face--right  { transform: rotateY(90deg)  translateZ(40px); background: linear-gradient(135deg, #e04040 0%, #c62828 50%, #b01818 100%); border: 1px solid rgba(240,90,90,0.5); box-shadow: inset -1px 0 2px rgba(255,180,180,0.4); }
.dice-face--left   { transform: rotateY(-90deg) translateZ(40px); background: linear-gradient(135deg, #ef5350 0%, #d32f2f 50%, #b71c1c 100%); border: 1px solid rgba(255,100,100,0.5); box-shadow: inset 1px 0 2px rgba(255,200,200,0.4); }
.dice-face--top    { transform: rotateX(90deg)  translateZ(40px); background: linear-gradient(135deg, #ef5350 0%, #e53935 50%, #c62828 100%); border: 1px solid rgba(255,120,120,0.45); box-shadow: inset 0 1px 3px rgba(255,220,220,0.5); }
.dice-face--bottom { transform: rotateX(-90deg) translateZ(40px); background: linear-gradient(135deg, #c62828 0%, #b71c1c 50%, #a51515 100%); border: 1px solid rgba(200,60,60,0.5); }

/* 白色点数 */
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, #f0e8e0);
  box-shadow:
    inset 0 1px 2px rgba(0,0,0,0.1),
    0 1px 2px rgba(0,0,0,0.3);
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
  animation: dice-throw-v2 0.82s cubic-bezier(0.18, 0.85, 0.26, 1) forwards;
}
@keyframes dice-throw-v2 {
  0% {
    transform: translateZ(-40px) translateY(-26px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(0.84);
    opacity: 0;
    filter: blur(1.8px);
  }
  10% {
    opacity: 1;
    filter: blur(0.4px);
  }
  35% {
    transform: translateZ(-40px) translateY(-78px)
      rotateX(var(--spin-x, 1200deg))
      rotateY(var(--spin-y, 1440deg))
      rotateZ(var(--spin-z, 900deg))
      scale(1.06);
  }
  62% {
    transform: translateZ(-40px) translateY(0)
      rotateX(calc(var(--spin-x, 1200deg) * 0.92))
      rotateY(calc(var(--spin-y, 1440deg) * 0.92))
      rotateZ(calc(var(--spin-z, 900deg) * 0.92))
      scale(0.98);
  }
  78% {
    transform: translateZ(-40px) translateY(-12px)
      rotateX(calc(var(--spin-x, 1200deg) * 0.96))
      rotateY(calc(var(--spin-y, 1440deg) * 0.96))
      rotateZ(calc(var(--spin-z, 900deg) * 0.96))
      scale(1.01);
  }
  100% {
    transform: translateZ(-40px) translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1);
    opacity: 1;
    filter: blur(0);
  }
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
