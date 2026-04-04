<!-- 布局热调面板 - 拖动滑块改CSS值 -->
<template>
  <Teleport to="body">
    <div
      :class="['layout-debug-panel', { collapsed }]"
      :style="{ left: `${px}px`, top: `${py}px` }"
      @mousedown="drag"
    >
      <div class="hdr" @click.stop="collapsed = !collapsed">
        <span>🔧 布局调试</span>
        <button class="close" @click.stop="$emit('close')">✕</button>
      </div>
      <div v-if="!collapsed" class="body">
        <div v-for="g in groups" :key="g.name" class="grp">
          <div class="grp-title">{{ g.name }}</div>
          <div v-for="s in g.sliders" :key="s.var" class="row">
            <label>{{ s.label }}</label>
            <input type="range" :min="s.min" :max="s.max" :step="s.step"
              :value="vals[s.var]" @input="set(s.var, +$event.target.value)" />
            <span class="v">{{ fmt(s.var, vals[s.var]) }}</span>
          </div>
        </div>
        <div class="btns">
          <button @click="resetAll">重置</button>
          <button @click="copyCSS">📋 复制CSS</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineEmits<{ close: [] }>()

/* ---------- panel position ---------- */
const px = ref(10); const py = ref(80)
let dragging = false, ox = 0, oy = 0
const drag = (e: MouseEvent) => {
  if (e.target instanceof HTMLInputElement) return // let sliders slide
  dragging = true; ox = e.clientX - px.value; oy = e.clientY - py.value
  const on = (ev: MouseEvent) => { px.value = ev.clientX - ox; py.value = ev.clientY - oy }
  const up = () => { dragging = false; window.removeEventListener('mousemove', on); window.removeEventListener('mouseup', up) }
  window.addEventListener('mousemove', on); window.addEventListener('mouseup', up)
}

const collapsed = ref(false)

/* ---------- sliders ---------- */
const defaultValues: Record<string, number> = {
  '--seat-left': -10,        // seat-left left %
  '--seat-right': -10,       // seat-right right %
  '--seat-top-w': 90,         // seat-top width %
  '--dl-top': 6,              // discard-zone--top top %
  '--dl-bottom': 6,           // discard-zone--bottom bottom %
  '--dl-left': 6,             // discard-zone--left left %
  '-- dl-right': 6,           // discard-zone--right right %
  '--dl-gap': 0,              // discard tile gap px
  '--dl-size': 22,            // discard tile font-size px
  '--my-gap': 2,              // self-hand gap px
  '--my-tgap': 1,             // self card gap px
  '--my-tsize': 48,           // self card size px
  '--oth-h': 26,              // other card height px
  '--oth-w': 36,              // other card width px
  '--oth-gap': 1,             // other hand gap px
  '--oth-mgap': 3,            // other meld gap px
  '--lbl-sz': 0.75,           // player-name-label font-size rem
}
// fix typo
delete defaultValues['-- dl-right']; defaultValues['--dl-right'] = 6

const vals = reactive({ ...defaultValues })

const groups = [
  { name: '🪑 座位', sliders: [
    { label: '左家', var: '--seat-left', min: -40, max: 0, step: 1, unit: '%' },
    { label: '右家', var: '--seat-right', min: -40, max: 0, step: 1, unit: '%' },
    { label: '对家宽', var: '--seat-top-w', min: 70, max: 100, step: 1, unit: '%' },
  ] },
  { name: '🀄 弃牌区', sliders: [
    { label: '上', var: '--dl-top', min: 0, max: 20, step: 0.5, unit: '%' },
    { label: '下', var: '--dl-bottom', min: 0, max: 20, step: 0.5, unit: '%' },
    { label: '左', var: '--dl-left', min: 0, max: 20, step: 0.5, unit: '%' },
    { label: '右', var: '--dl-right', min: 0, max: 20, step: 0.5, unit: '%' },
    { label: '牌间距', var: '--dl-gap', min: -1, max: 3, step: 0.5, unit: 'px' },
    { label: '字号', var: '--dl-size', min: 14, max: 28, step: 1, unit: 'px' },
  ] },
  { name: '🫵 自家手牌', sliders: [
    { label: '行间距', var: '--my-gap', min: 0, max: 10, step: 1, unit: 'px' },
    { label: '牌间距', var: '--my-tgap', min: 0, max: 5, step: 0.5, unit: 'px' },
    { label: '牌大小', var: '--my-tsize', min: 38, max: 56, step: 1, unit: 'px' },
  ] },
  { name: '🧑 他人手牌', sliders: [
    { label: '牌高', var: '--oth-h', min: 20, max: 34, step: 1, unit: 'px' },
    { label: '牌宽', var: '--oth-w', min: 28, max: 44, step: 1, unit: 'px' },
    { label: '手间距', var: '--oth-gap', min: 0, max: 5, step: 0.5, unit: 'px' },
    { label: '门间距', var: '--oth-mgap', min: 0, max: 8, step: 1, unit: 'px' },
  ] },
  { name: '📛 名字', sliders: [
    { label: '字号', var: '--lbl-sz', min: 0.5, max: 1.2, step: 0.05, unit: 'rem' },
  ] },
]

/* helpers */
const sliders: Record<string, typeof groups[number]['sliders'][number]> = {}
for (const g of groups) for (const s of g.sliders) sliders[s.var] = s

function set(v: string, n: number) {
  vals[v] = n
  apply()
}
function fmt(v: string, n: number) {
  return n + (sliders[v]?.unit ?? '')
}

/* inject CSS */
let styleEl: HTMLStyleElement | null = null
function apply() {
  const root = document.documentElement
  for (const k in vals) root.style.setProperty(k, String(vals[k]))
  // also patch specific selectors that don't use vars
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'debug-panel-inject'
    document.head.appendChild(styleEl)
  }
  const u = (v: string) => vals[v]
  styleEl.textContent = `
    .seat-left { left: ${u('--seat-left')}% !important; }
    .seat-right { right: ${u('--seat-right')}% !important; }
    .seat-top { width: ${u('--seat-top-w')}% !important; }
    .discard-zone--top { top: ${u('--dl-top')}% !important; }
    .discard-zone--bottom { bottom: ${u('--dl-bottom')}% !important; }
    .discard-zone--left { left: ${u('--dl-left')}% !important; }
    .discard-zone--right { right: ${u('--dl-right')}% !important; }
    .discard-tile { gap: ${u('--dl-gap')}px !important; font-size: ${u('--dl-size')}px !important; }
    .self-hand { gap: ${u('--my-gap')}px !important; }
    .self-tile { gap: ${u('--my-tgap')}px !important; transform: scale(${u('--my-tsize') / 48}) !important; }
    .other-tile { height: ${u('--oth-h')}px !important; width: ${u('--oth-w')}px !important; }
    .player-other-hand { gap: ${u('--oth-gap')}px !important; }
    .player-other-melds { gap: ${u('--oth-mgap')}px !important; }
    .player-name-label { font-size: ${u('--lbl-sz')}rem !important; }
  `
}

function resetAll() {
  Object.assign(vals, defaultValues)
  apply()
}

async function copyCSS() {
  const u = (k: string) => vals[k]
  const css = `/* 告诉小虾米以下参数： */
.seat-left { left: ${u('--seat-left')}% !important; }
.seat-right { right: ${u('--seat-right')}% !important; }
.seat-top { width: ${u('--seat-top-w')}% !important; }
.discard-zone--top { top: ${u('--dl-top')}% !important; }
.discard-zone--bottom { bottom: ${u('--dl-bottom')}% !important; }
.discard-zone--left { left: ${u('--dl-left')}% !important; }
.discard-zone--right { right: ${u('--dl-right')}% !important; }
.discard-tile { gap: ${u('--dl-gap')}px; font-size: ${u('--dl-size')}px; }
.self-hand { gap: ${u('--my-gap')}px; }
.self-tile { gap: ${u('--my-tgap')}px; }
.other-tile { height: ${u('--oth-h')}px; width: ${u('--oth-w')}px; }
.player-other-hand { gap: ${u('--oth-gap')}px; }
.player-other-melds { gap: ${u('--oth-mgap')}px; }
.player-name-label { font-size: ${u('--lbl-sz')}rem; }`
  await navigator.clipboard.writeText(css)
}
</script>

<style scoped>
.layout-debug-panel {
  position: fixed; z-index: 9999;
  width: 240px; background: #111118;
  border: 1px solid #00ffaa66; border-radius: 8px;
  color: #eee; font-size: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.7);
  user-select: none;
  transition: background .2s;
  max-height: 80vh; overflow-y: auto;
}
.collapsed { max-height: 38px; overflow: hidden; }
.hdr {
  padding: 8px 12px; font-weight: 700; cursor: grab;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid #222; background: #1a1a2e; border-radius: 8px 8px 0 0;
}
.hdr:active { cursor: grabbing; }
.close { background: none; border: none; color: #f88; font-size: 16px; cursor: pointer; }
.body { padding: 10px 12px 14px; }
.grp { margin-bottom: 14px; }
.grp-title {
  font-weight: 600; font-size: 11px; color: #00ffaa;
  border-bottom: 1px solid #222; padding-bottom: 3px; margin-bottom: 6px;
}
.row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.row label { min-width: 52px; font-size: 11px; color: #bbb; }
.row input[type="range"] { flex: 1; }
.v { font-family: ui-monospace, monospace; min-width: 42px; text-align: right; color: #888; }
.btns { display: flex; gap: 6px; margin-top: 10px; }
.btns button {
  flex: 1; padding: 6px; font-size: 11px; background: #2a2a3e; color: #ccc;
  border: 1px solid #444; border-radius: 4px; cursor: pointer;
}
.btns button:hover { background: #3a3a56; }
</style>