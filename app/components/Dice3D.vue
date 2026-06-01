<template>
  <div ref="rootEl" class="dice-scene" :style="delayStyle">
    <canvas ref="canvasEl" class="dice-canvas" />
    <div class="dice-shadow" :class="`dice-shadow--${state}`"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  value: number
  state: 'idle' | 'rolling' | 'landed'
  delay?: number
  rollSeed?: number
}>()

type ThreeModule = typeof import('three')
type CleanupFn = () => void

const rootEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const delayStyle = computed(() => ({
  ...(props.delay ? { animationDelay: `${props.delay}s` } : {}),
}))

let three: ThreeModule | null = null
let renderer: import('three').WebGLRenderer | null = null
let scene: import('three').Scene | null = null
let camera: import('three').PerspectiveCamera | null = null
let displayGroup: import('three').Group | null = null
let dicePivot: import('three').Group | null = null
let cubeMesh: import('three').Mesh | null = null
let shadowMesh: import('three').Mesh | null = null
let resizeCleanup: CleanupFn | null = null
let rafId = 0
let phaseStartedAt = 0
let phaseSeed = 0

const LAND_DURATION = 260
const ROLL_DURATION = 1180
const IDLE_TILT_X = -0.58
const IDLE_TILT_Y = 0.72
const LANDED_TILT_X = 0
const LANDED_TILT_Y = 0

function clampValue(value: number) {
  if (value <= 0) return 0  // 0 = 未掷，显示空白
  return Math.min(6, Math.max(1, Math.round(value)))
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function easeOutBack(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

function faceTexture(value: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const gradient = ctx.createLinearGradient(0, 0, 256, 256)
  gradient.addColorStop(0, '#fffdfa')
  gradient.addColorStop(0.55, '#f6efe3')
  gradient.addColorStop(1, '#eadfcf')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  ctx.strokeStyle = 'rgba(143, 109, 68, 0.28)'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.roundRect(12, 12, 232, 232, 34)
  ctx.stroke()

  // 【修复】value=0 时显示 ? 而不是 1
  if (value <= 0) {
    ctx.fillStyle = 'rgba(143, 109, 68, 0.35)'
    ctx.font = 'bold 120px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('?', 128, 128)
    return canvas
  }

  const positions: Record<number, Array<[number, number]>> = {
    1: [[128, 128]],
    2: [[74, 74], [182, 182]],
    3: [[74, 74], [128, 128], [182, 182]],
    4: [[74, 74], [182, 74], [74, 182], [182, 182]],
    5: [[74, 74], [182, 74], [128, 128], [74, 182], [182, 182]],
    6: [[74, 68], [182, 68], [74, 128], [182, 128], [74, 188], [182, 188]],
  }

  for (const [x, y] of positions[value] ?? positions[1]) {
    const pip = ctx.createRadialGradient(x - 10, y - 12, 8, x, y, 26)
    pip.addColorStop(0, '#ffb0b0')
    pip.addColorStop(0.25, '#d72626')
    pip.addColorStop(0.8, '#921616')
    pip.addColorStop(1, '#5f0f0f')
    ctx.fillStyle = pip
    ctx.beginPath()
    ctx.arc(x, y, 20, 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas
}

function orientationForFrontFace(value: number) {
  if (!three) return null
  if (value <= 0) return new three.Quaternion()  // 0 = 默认朝向（?面）
  const eulerMap: Record<number, [number, number, number]> = {
    1: [Math.PI / 2, 0, 0],
    2: [0, 0, 0],
    3: [0, -Math.PI / 2, 0],
    4: [0, Math.PI / 2, 0],
    5: [0, Math.PI, 0],
    6: [-Math.PI / 2, 0, 0],
  }
  const [x, y, z] = eulerMap[clampValue(value)] ?? eulerMap[1]
  return new three.Quaternion().setFromEuler(new three.Euler(x, y, z, 'XYZ'))
}

function setPhaseStart() {
  phaseStartedAt = performance.now()
  phaseSeed = props.rollSeed ?? 0
}

async function initThree() {
  if (!rootEl.value || !canvasEl.value || renderer) return
  three = await import('three')
  const THREE = three

  renderer = new THREE.WebGLRenderer({
    canvas: canvasEl.value,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearAlpha(0)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
  camera.position.set(0, 0.35, 5.3)

  const ambient = new THREE.AmbientLight('#fff3dc', 2.4)
  scene.add(ambient)

  const keyLight = new THREE.DirectionalLight('#fffef8', 2.2)
  keyLight.position.set(3.2, 4.6, 5.2)
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight('#b8e8ff', 0.75)
  fillLight.position.set(-3.4, 2.4, 2.4)
  scene.add(fillLight)

  const warmBounce = new THREE.PointLight('#ffd39a', 1.15, 18)
  warmBounce.position.set(0, -1.6, 2.2)
  scene.add(warmBounce)

  displayGroup = new THREE.Group()
  displayGroup.rotation.set(IDLE_TILT_X, IDLE_TILT_Y, 0)
  scene.add(displayGroup)

  dicePivot = new THREE.Group()
  displayGroup.add(dicePivot)

  const materials = [3, 4, 1, 6, 2, 5].map((faceValue) => {
    const texture = new THREE.CanvasTexture(faceTexture(faceValue))
    texture.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.48,
      metalness: 0.02,
    })
  })

  cubeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 1.52, 1.52, 1, 1, 1),
    materials,
  )
  cubeMesh.castShadow = false
  cubeMesh.receiveShadow = false
  dicePivot.add(cubeMesh)

  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: '#000000',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  })
  shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), shadowMaterial)
  shadowMesh.rotation.x = -Math.PI / 2
  shadowMesh.position.set(0, -1.48, 0)
  shadowMesh.scale.set(1, 0.72, 1)
  scene.add(shadowMesh)

  const resize = () => {
    if (!renderer || !camera || !rootEl.value) return
    const width = rootEl.value.clientWidth || 92
    const height = rootEl.value.clientHeight || 92
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(rootEl.value)
  resizeCleanup = () => observer.disconnect()

  setPhaseStart()
  animate()
}

function renderFrame(now: number) {
  if (!three || !renderer || !scene || !camera || !displayGroup || !dicePivot || !shadowMesh) return
  const THREE = three
  const elapsed = now - phaseStartedAt
  const targetQuat = orientationForFrontFace(props.value) ?? new THREE.Quaternion()

  if (props.state === 'idle') {
    const t = now * 0.001
    displayGroup.position.set(0, Math.sin(t * 1.7 + props.value) * 0.06, 0)
    displayGroup.rotation.x = IDLE_TILT_X + Math.sin(t * 1.4) * 0.04
    displayGroup.rotation.y = IDLE_TILT_Y + t * 0.36
    dicePivot.quaternion.slerp(targetQuat, 0.08)
    shadowMesh.position.x = Math.sin(t * 1.1 + props.value) * 0.08
    shadowMesh.scale.setScalar(0.92 + Math.sin(t * 1.7) * 0.04)
    ;(shadowMesh.material as import('three').MeshBasicMaterial).opacity = 0.18
  } else if (props.state === 'rolling') {
    const t = Math.min(1, elapsed / ROLL_DURATION)
    const lift = Math.sin(t * Math.PI) * 0.92 + Math.sin(t * Math.PI * 2.6) * 0.12
    const sway = Math.sin(t * Math.PI * 2.2 + phaseSeed * 0.017) * 0.28
    const spinX = (12 + (phaseSeed % 5)) * Math.PI * t
    const spinY = (14 + (phaseSeed % 7)) * Math.PI * t
    const spinZ = (8 + (phaseSeed % 3)) * Math.PI * t
    const settle = easeOutBack(t)

    displayGroup.position.set(sway * (1 - t * 0.55), -lift * 0.18, 0)
    displayGroup.rotation.x = IDLE_TILT_X + 0.2 * (1 - t)
    displayGroup.rotation.y = IDLE_TILT_Y + sway * 0.18
    dicePivot.quaternion.setFromEuler(new THREE.Euler(spinX, spinY, spinZ, 'XYZ'))
    dicePivot.quaternion.slerp(targetQuat, Math.max(0, settle - 0.18))

    shadowMesh.position.x = sway * 0.42
    shadowMesh.scale.set(0.72 + t * 0.42, 0.46 + t * 0.26, 1)
    ;(shadowMesh.material as import('three').MeshBasicMaterial).opacity = 0.08 + (1 - lift * 0.5) * 0.16
  } else {
    const t = Math.min(1, elapsed / LAND_DURATION)
    const bounce = Math.sin((1 - t) * Math.PI * 2.4) * 0.06 * (1 - t)
    displayGroup.position.set(0, -Math.abs(bounce), 0)
    displayGroup.rotation.x = LANDED_TILT_X
    displayGroup.rotation.y = LANDED_TILT_Y
    if (t >= 0.96) {
      dicePivot.quaternion.copy(targetQuat)
    } else {
      dicePivot.quaternion.slerp(targetQuat, 0.28 + t * 0.28)
    }
    shadowMesh.position.x = 0
    shadowMesh.scale.set(1, 0.72, 1)
    ;(shadowMesh.material as import('three').MeshBasicMaterial).opacity = 0.22
  }

  renderer.render(scene, camera)
}

function animate() {
  cancelAnimationFrame(rafId)
  const loop = (now: number) => {
    renderFrame(now)
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

watch(
  () => [props.state, props.value, props.rollSeed] as const,
  () => {
    if (!renderer) return
    setPhaseStart()
  },
)

onMounted(() => {
  initThree()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  resizeCleanup?.()
  resizeCleanup = null
  renderer?.dispose()
  scene?.traverse((node) => {
    const mesh = node as import('three').Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    const material = mesh.material
    if (Array.isArray(material)) {
      for (const entry of material) {
        entry.map?.dispose()
        entry.dispose()
      }
    } else if (material) {
      material.map?.dispose?.()
      material.dispose?.()
    }
  })
  three = null
  renderer = null
  scene = null
  camera = null
  displayGroup = null
  dicePivot = null
  cubeMesh = null
  shadowMesh = null
})
</script>

<style scoped>
.dice-scene {
  position: relative;
  width: 108px;
  height: 108px;
  transform-style: preserve-3d;
}

.dice-canvas {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 12px 22px rgba(0, 0, 0, 0.28));
}

.dice-shadow {
  position: absolute;
  left: 50%;
  bottom: 8px;
  width: 54px;
  height: 16px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.14) 58%, rgba(0, 0, 0, 0) 100%);
  filter: blur(6px);
  pointer-events: none;
}

.dice-shadow--idle {
  animation: shadow-idle 3.8s ease-in-out infinite;
}

.dice-shadow--rolling {
  animation: shadow-roll 1.18s ease-out forwards;
}

.dice-shadow--landed {
  animation: shadow-land 0.26s ease-out;
}

@keyframes shadow-idle {
  0%, 100% { transform: translateX(-50%) scale(0.95); opacity: 0.28; }
  50% { transform: translateX(-50%) scale(1.08); opacity: 0.4; }
}

@keyframes shadow-roll {
  0% { transform: translateX(-50%) scale(0.82); opacity: 0.16; }
  34% { transform: translateX(-50%) scale(0.52); opacity: 0.06; }
  100% { transform: translateX(-50%) scale(1); opacity: 0.36; }
}

@keyframes shadow-land {
  0% { transform: translateX(-50%) scale(1.18); opacity: 0.26; }
  100% { transform: translateX(-50%) scale(1); opacity: 0.36; }
}
</style>
