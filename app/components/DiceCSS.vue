<template>
  <div
    ref="rootEl"
    class="dice-css"
    :class="[`dice-css--${state}`, `dice-css--val-${landedValue}`]"
    :style="delayStyle"
  >
    <div class="dice-css__cube">
      <div v-for="n in 6" :key="n" class="dice-css__face" :class="`dice-css__face--${n}`">
        <div class="dice-css__pips">
          <span
            v-for="i in pipPositions[n]?.length || 0"
            :key="i"
            class="dice-css__pip"
            :style="pipStyle(pipPositions[n][i-1])"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  state: 'idle' | 'rolling' | 'landed'
  delay?: number
  rollSeed?: number
}>()

const landedValue = computed(() => Math.min(6, Math.max(1, Math.round(props.value || 1))))

const delayStyle = computed(() => ({
  ...(props.delay ? { animationDelay: `${props.delay}s` } : {}),
}))

// Pip positions for each face (normalized 0-1 coordinates)
const pipPositions: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.5], [0.72, 0.5], [0.28, 0.78], [0.72, 0.78]],
}

const pipStyle = ([x, y]: [number, number]) => ({
  left: `${x * 100}%`,
  top: `${y * 100}%`,
})
</script>

<style scoped>
.dice-css {
  width: 96px;
  height: 96px;
  perspective: 600px;
  perspective-origin: 50% 50%;
}

/* Face rotation: standard dice layout */
/* front=1 (identity), right=2 (Y:-90), top=3 (X:90), bottom=4 (X:-90), left=5 (Y:90), back=6 (Y:180) */
.dice-css__cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dice-css__face {
  position: absolute;
  width: 96px;
  height: 96px;
  border-radius: 16px;
  background: linear-gradient(145deg, #fffdfa 0%, #f6efe3 55%, #eadfcf 100%);
  border: 2px solid rgba(143, 109, 68, 0.25);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6);
  backface-visibility: hidden;
  overflow: hidden;
}

.dice-css__face--1 { transform: rotateY(0deg) translateZ(48px); }
.dice-css__face--2 { transform: rotateY(-90deg) translateZ(48px); }
.dice-css__face--3 { transform: rotateX(90deg) translateZ(48px); }
.dice-css__face--4 { transform: rotateX(-90deg) translateZ(48px); }
.dice-css__face--5 { transform: rotateY(90deg) translateZ(48px); }
.dice-css__face--6 { transform: rotateY(180deg) translateZ(48px); }

.dice-css__pips {
  position: relative;
  width: 100%;
  height: 100%;
}

.dice-css__pip {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 35%, #ffb0b0 0%, #d72626 30%, #921616 70%, #5f0f0f 100%);
  transform: translate(-50%, -50%);
  box-shadow: inset 0 -2px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15);
}

/* === STATES === */

/* IDLE: slow float + gentle rotation */
.dice-css--idle .dice-css__cube {
  animation: dice-idle 3s ease-in-out infinite;
}

@keyframes dice-idle {
  0%, 100% { transform: rotateX(-8deg) rotateY(30deg); }
  25% { transform: rotateX(-4deg) rotateY(40deg) translateY(-3px); }
  50% { transform: rotateX(-10deg) rotateY(50deg) translateY(0px); }
  75% { transform: rotateX(-6deg) rotateY(35deg) translateY(-2px); }
}

/* ROLLING: fast chaotic spin */
.dice-css--rolling .dice-css__cube {
  animation: dice-roll 0.6s cubic-bezier(0.22, 0.01, 0.36, 1) infinite;
}

@keyframes dice-roll {
  0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(0.92); }
  25% { transform: rotateX(180deg) rotateY(90deg) rotateZ(45deg) scale(1.08); }
  50% { transform: rotateX(360deg) rotateY(180deg) rotateZ(90deg) scale(0.92); }
  75% { transform: rotateX(540deg) rotateY(270deg) rotateZ(135deg) scale(1.08); }
  100% { transform: rotateX(720deg) rotateY(360deg) rotateZ(180deg) scale(0.92); }
}

/* LANDED: snap to value with bounce */
/* Euler mapping: 1=front, 2=right, 3=top, 4=bottom, 5=left, 6=back */
.dice-css--val-1 .dice-css__cube { transform: rotateX(0deg) rotateY(0deg); }
.dice-css--val-2 .dice-css__cube { transform: rotateY(-90deg); }
.dice-css--val-3 .dice-css__cube { transform: rotateX(90deg); }
.dice-css--val-4 .dice-css__cube { transform: rotateX(-90deg); }
.dice-css--val-5 .dice-css__cube { transform: rotateY(90deg); }
.dice-css--val-6 .dice-css__cube { transform: rotateY(180deg); }

.dice-css--landed .dice-css__cube {
  animation: dice-landed 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes dice-landed {
  0% { transform: rotateX(var(--land-rot-x)) rotateY(var(--land-rot-y)) scale(1.3); }
  60% { transform: rotateX(var(--land-rot-x)) rotateY(var(--land-rot-y)) scale(0.92); }
  100% { transform: rotateX(var(--land-rot-x)) rotateY(var(--land-rot-y)) scale(1); }
}

/* Hover lift for clickable dice */
.dice-css--idle:hover .dice-css__cube {
  animation-duration: 1.8s;
  filter: brightness(1.08);
}
</style>
