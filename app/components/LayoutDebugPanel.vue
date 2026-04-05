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
  if (e.target instanceof HTMLInputElement) return
  dragging = true; ox = e.clientX - px.value; oy = e.clientY - py.value
  const on = (ev: MouseEvent) => { px.value = ev.clientX - ox; py.value = ev.clientY - oy }
  const up = () => { dragging = false; window.removeEventListener('mousemove', on); window.removeEventListener('mouseup', up) }
  window.addEventListener('mousemove', on); window.addEventListener('mouseup', up)
}

const collapsed = ref(false)

/* ---------- sliders ---------- */
const defaultValues: Record<string, number> = {
  // 座位
  '--seat-left': -10,
  '--seat-right': -10,
  '--seat-top-w': 90,
  '--seat-bottom-scale': 120,
  // 弃牌区位置
  '--dl-top': 31,
  '--dl-bottom': 31,
  '--dl-left': 21.6,
  '--dl-right': 21.6,
  // 弃牌区网格
  '--dl-cols': 8,
  '--dl-tsize': 22,
  '--dl-gap': 1,
  '--dl-rowgap': 1,
  '--dl-zone-rotate': 0,
  // 自家手牌
  '--my-gap': 4,
  '--my-tgap': 2,
  '--my-tsize': 48,
  '--my-maxw': 440,
  '--my-rotate': 0,
  '--my-dir': 0,
  '--my-reverse': 0,
  // 他人手牌
  '--oth-h': 26,
  '--oth-w': 36,
  '--oth-gap': 1,
  '--oth-mgap': 3,
  '--oth-rotate': 0,
  '--oth-dir': 0,
  '--oth-reverse': 0,
  // 门口牌
  '--meld-gap': 8,
  '--meld-tile-sz': 36,
  // 名字
  '--lbl-sz': 0.75,
  // 操作按钮区
  '--act-panel-w': 100,
  '--act-panel-pad': 12,
  '--act-btn-sz': 44,
  '--act-draw-sz': 72,
  '--act-gap': 6,
  '--act-panel-mt': 0,
  // 牌桌
  '--table-w': 1200,
  '--table-aspect': 1.333,
  '--felt-pad': 0,
}

const vals = reactive({ ...defaultValues })

const groups = [
  { name: '🪑 座位', sliders: [
    { label: '左家', var: '--seat-left', min: -40, max: 0, step: 1, unit: '%' },
    { label: '右家', var: '--seat-right', min: -40, max: 0, step: 1, unit: '%' },
    { label: '对家宽', var: '--seat-top-w', min: 50, max: 100, step: 1, unit: '%' },
    { label: '自家缩放', var: '--seat-bottom-scale', min: 80, max: 150, step: 1, unit: '%' },
  ] },
  { name: '🗑️ 弃牌区位置', sliders: [
    { label: '上%', var: '--dl-top', min: 0, max: 50, step: 0.5, unit: '%' },
    { label: '下%', var: '--dl-bottom', min: 0, max: 50, step: 0.5, unit: '%' },
    { label: '左%', var: '--dl-left', min: 0, max: 50, step: 0.5, unit: '%' },
    { label: '右%', var: '--dl-right', min: 0, max: 50, step: 0.5, unit: '%' },
    { label: '区旋转', var: '--dl-zone-rotate', min: -180, max: 180, step: 5, unit: '°' },
  ] },
  { name: '🗑️ 弃牌网格', sliders: [
    { label: '列数', var: '--dl-cols', min: 4, max: 12, step: 1, unit: '' },
    { label: '牌大小', var: '--dl-tsize', min: 16, max: 36, step: 1, unit: 'px' },
    { label: '牌间距', var: '--dl-gap', min: -2, max: 6, step: 0.5, unit: 'px' },
    { label: '行间距', var: '--dl-rowgap', min: -2, max: 6, step: 0.5, unit: 'px' },
  ] },
  { name: '🫵 自家手牌', sliders: [
    { label: '行间距', var: '--my-gap', min: 0, max: 16, step: 1, unit: 'px' },
    { label: '牌间距', var: '--my-tgap', min: 0, max: 8, step: 0.5, unit: 'px' },
    { label: '牌大小', var: '--my-tsize', min: 32, max: 64, step: 1, unit: 'px' },
    { label: '最大宽', var: '--my-maxw', min: 200, max: 800, step: 10, unit: 'px' },
    { label: '旋转', var: '--my-rotate', min: -180, max: 180, step: 5, unit: '°' },
    { label: '排列', var: '--my-dir', min: 0, max: 1, step: 1, unit: '' },
    { label: '反向', var: '--my-reverse', min: 0, max: 1, step: 1, unit: '' },
  ] },
  { name: '🧑 他人手牌', sliders: [
    { label: '牌高', var: '--oth-h', min: 18, max: 40, step: 1, unit: 'px' },
    { label: '牌宽', var: '--oth-w', min: 24, max: 50, step: 1, unit: 'px' },
    { label: '手间距', var: '--oth-gap', min: 0, max: 8, step: 0.5, unit: 'px' },
    { label: '门间距', var: '--oth-mgap', min: 0, max: 12, step: 1, unit: 'px' },
    { label: '旋转', var: '--oth-rotate', min: -180, max: 180, step: 5, unit: '°' },
    { label: '排列', var: '--oth-dir', min: 0, max: 1, step: 1, unit: '' },
    { label: '反向', var: '--oth-reverse', min: 0, max: 1, step: 1, unit: '' },
  ] },
  { name: '🏠 门口牌', sliders: [
    { label: '间距', var: '--meld-gap', min: 2, max: 20, step: 1, unit: 'px' },
    { label: '牌大小', var: '--meld-tile-sz', min: 24, max: 52, step: 1, unit: 'px' },
  ] },
  { name: '📛 名字', sliders: [
    { label: '字号', var: '--lbl-sz', min: 0.5, max: 1.5, step: 0.05, unit: 'rem' },
  ] },
  { name: '🎮 操作按钮', sliders: [
    { label: '面板宽', var: '--act-panel-w', min: 50, max: 100, step: 1, unit: '%' },
    { label: '内边距', var: '--act-panel-pad', min: 4, max: 24, step: 1, unit: 'px' },
    { label: '小按钮', var: '--act-btn-sz', min: 28, max: 64, step: 1, unit: 'px' },
    { label: '摸牌钮', var: '--act-draw-sz', min: 40, max: 100, step: 1, unit: 'px' },
    { label: '按钮间距', var: '--act-gap', min: 2, max: 16, step: 1, unit: 'px' },
    { label: '上边距', var: '--act-panel-mt', min: 0, max: 32, step: 1, unit: 'px' },
  ] },
  { name: '🃏 牌桌', sliders: [
    { label: '最大宽', var: '--table-w', min: 600, max: 1600, step: 20, unit: 'px' },
    { label: '宽高比', var: '--table-aspect', min: 1.0, max: 2.0, step: 0.05, unit: '' },
    { label: '桌布内边距', var: '--felt-pad', min: 0, max: 60, step: 2, unit: 'px' },
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
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'debug-panel-inject'
    document.head.appendChild(styleEl)
  }
  const u = (v: string) => vals[v]
  const myDir = u('--my-dir') === 1 ? 'column' : 'row'
  const myRev = u('--my-reverse') === 1 ? 'row-reverse' : (myDir === 'column' ? 'column-reverse' : 'row-reverse')
  const othDir = u('--oth-dir') === 1 ? 'column' : 'row'
  const othRev = u('--oth-reverse') === 1 ? 'row-reverse' : (othDir === 'column' ? 'column-reverse' : 'row-reverse')
  const dlCols = Math.round(u('--dl-cols'))
  const dlTsize = u('--dl-tsize')
  const dlRowgap = u('--dl-rowgap')
  const dlZoneRotate = u('--dl-zone-rotate')
  const meldTileSz = u('--meld-tile-sz')
  const meldTileH = Math.round(meldTileSz * 1.4)

  styleEl.textContent = `
    /* 座位 */
    .seat-left { left: ${u('--seat-left')}% !important; }
    .seat-right { right: ${u('--seat-right')}% !important; }
    .seat-top { width: ${u('--seat-top-w')}% !important; }
    .seat-bottom { transform: translateX(-50%) scale(${u('--seat-bottom-scale') / 100}) translateY(-5%) !important; }

    /* 弃牌区位置 */
    .discard-zone--top { top: ${u('--dl-top')}% !important; transform: translateX(-50%) rotate(${dlZoneRotate}deg) !important; }
    .discard-zone--bottom { bottom: ${u('--dl-bottom')}% !important; transform: translateX(-50%) rotate(${dlZoneRotate}deg) !important; }
    .discard-zone--left { left: calc(${u('--dl-left')}% + 20px) !important; transform: translateY(-50%) rotate(${dlZoneRotate + 90}deg) !important; }
    .discard-zone--right { right: calc(${u('--dl-right')}% + 20px) !important; transform: translateY(-50%) rotate(${dlZoneRotate - 90}deg) !important; }

    /* 弃牌网格 */
    .discards-grid { grid-template-columns: repeat(${dlCols}, ${dlTsize}px) !important; gap: ${u('--dl-gap')}px ${dlRowgap}px !important; }
    .discards-grid .tile { width: ${dlTsize}px !important; height: ${Math.round(dlTsize * 1.4)}px !important; }

    /* 自家手牌 */
    .player-hand { gap: ${u('--my-tgap')}px !important; max-width: ${u('--my-maxw')}px !important; }
    .player-hand .tile { transform: scale(${u('--my-tsize') / 48}) rotate(${u('--my-rotate')}deg) !important; }

    /* 他人手牌 */
    .other-tile { height: ${u('--oth-h')}px !important; width: ${u('--oth-w')}px !important; transform: rotate(${u('--oth-rotate')}deg) !important; }
    .player-other-hand { gap: ${u('--oth-gap')}px !important; }
    .player-other-melds { gap: ${u('--oth-mgap')}px !important; }

    /* 门口牌 */
    .player-melds { gap: ${u('--meld-gap')}px !important; }
    .player-melds .tile { width: ${meldTileSz}px !important; height: ${meldTileH}px !important; }

    /* 名字 */
    .player-name-label { font-size: ${u('--lbl-sz')}rem !important; }

    /* 操作按钮 */
    .action-panel { padding: ${u('--act-panel-pad')}px !important; width: ${u('--act-panel-w')}% !important; margin-top: ${u('--act-panel-mt')}px !important; }
    .action-btn--small { width: ${u('--act-btn-sz')}px !important; height: ${u('--act-btn-sz')}px !important; }
    .action-btn--draw { width: ${u('--act-draw-sz')}px !important; height: ${u('--act-draw-sz')}px !important; }
    .action-grid { gap: ${u('--act-gap')}px !important; }
    .action-grid-secondary { gap: ${u('--act-gap')}px !important; }

    /* 牌桌 */
    .mahjong-table { max-width: ${u('--table-w')}px !important; aspect-ratio: ${u('--table-aspect')} / 1 !important; }
    .table-felt { padding: ${u('--felt-pad')}px !important; }
  `
}

function resetAll() {
  Object.assign(vals, defaultValues)
  apply()
}

async function copyCSS() {
  const u = (k: string) => vals[k]
  const myDir = u('--my-dir') === 1 ? 'column' : 'row'
  const othDir = u('--oth-dir') === 1 ? 'column' : 'row'
  const css = `/* 告诉小虾米以下参数： */
/* 座位 */
.seat-left { left: ${u('--seat-left')}% }
.seat-right { right: ${u('--seat-right')}% }
.seat-top { width: ${u('--seat-top-w')}% }
.seat-bottom { transform: translateX(-50%) scale(${u('--seat-bottom-scale') / 100}) }

/* 弃牌区 */
.discard-zone--top { top: ${u('--dl-top')}% }
.discard-zone--bottom { bottom: ${u('--dl-bottom')}% }
.discard-zone--left { left: calc(${u('--dl-left')}% + 20px) }
.discard-zone--right { right: calc(${u('--dl-right')}% + 20px) }
.discard-zone { transform: rotate(${u('--dl-zone-rotate')}deg) }

/* 弃牌网格 */
.discards-grid { grid-template-columns: repeat(${Math.round(u('--dl-cols'))}, ${u('--dl-tsize')}px); gap: ${u('--dl-gap')}px ${u('--dl-rowgap')}px; }

/* 自家手牌 */
.player-hand { gap: ${u('--my-tgap')}px; max-width: ${u('--my-maxw')}px; }
.player-hand .tile { transform: scale(${u('--my-tsize') / 48}) rotate(${u('--my-rotate')}deg); }

/* 他人手牌 */
.other-tile { height: ${u('--oth-h')}px; width: ${u('--oth-w')}px; transform: rotate(${u('--oth-rotate')}deg); }
.player-other-hand { gap: ${u('--oth-gap')}px; }
.player-other-melds { gap: ${u('--oth-mgap')}px; }

/* 门口牌 */
.player-melds { gap: ${u('--meld-gap')}px; }

/* 操作按钮 */
.action-panel { padding: ${u('--act-panel-pad')}px; width: ${u('--act-panel-w')}%; }
.action-btn--small { width: ${u('--act-btn-sz')}px; height: ${u('--act-btn-sz')}px; }
.action-btn--draw { width: ${u('--act-draw-sz')}px; height: ${u('--act-draw-sz')}px; }

/* 牌桌 */
.mahjong-table { max-width: ${u('--table-w')}px; aspect-ratio: ${u('--table-aspect')} / 1; }`
  await navigator.clipboard.writeText(css)
}
</script>

<style scoped>
.layout-debug-panel {
  position: fixed; z-index: 9999;
  width: 260px; background: #111118;
  border: 1px solid #00ffaa66; border-radius: 8px;
  color: #eee; font-size: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.7);
  user-select: none;
  transition: background .2s;
  max-height: 85vh; overflow-y: auto;
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
