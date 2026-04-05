<!-- 布局热调面板 v2 — 按每家/每区域分组，全覆盖 -->
<template>
  <Teleport to="body">
    <div
      :class="['layout-debug-panel', { collapsed }]"
      :style="{ left: `${px}px`, top: `${py}px` }"
      @mousedown="drag"
    >
      <div class="hdr" @click.stop="collapsed = !collapsed">
        <span>🔧 布局调试 v2</span>
        <button class="close" @click.stop="$emit('close')">✕</button>
      </div>
      <div v-if="!collapsed" class="body">
        <!-- 搜索过滤 -->
        <div class="search-row">
          <input v-model="search" placeholder="搜索参数..." class="search-input" />
          <button v-if="search" @click="search=''" class="search-clear">✕</button>
        </div>

        <div v-for="g in filteredGroups" :key="g.name" class="grp">
          <div class="grp-title" @click="toggleGroup(g.name)">
            <span class="grp-arrow">{{ openGroups.has(g.name) ? '▼' : '▶' }}</span>
            {{ g.name }}
          </div>
          <div v-if="openGroups.has(g.name)" class="grp-body">
            <div v-for="s in g.sliders" :key="s.var" class="row">
              <label :title="s.var">{{ s.label }}</label>
              <input type="range" :min="s.min" :max="s.max" :step="s.step"
                :value="vals[s.var]" @input="set(s.var, +$event.target.value)" />
              <span class="v">{{ fmt(s.var, vals[s.var]) }}</span>
            </div>
          </div>
        </div>
        <div class="btns">
          <button @click="resetAll">重置全部</button>
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
const search = ref('')
const openGroups = ref<Set<string>>(new Set(['🫵 自家·手牌', '🃏 牌桌', '🎮 操作按钮']))
const toggleGroup = (name: string) => {
  if (openGroups.value.has(name)) openGroups.value.delete(name)
  else openGroups.value.add(name)
}

/* ---------- 默认值 ---------- */
const D: Record<string, number> = {
  // ===== 牌桌 =====
  '--tbl-maxw': 1200,
  '--tbl-aspect': 1.333,
  '--tbl-border': 12,
  '--tbl-frame': '#3a2006',
  '--felt-pad': 0,
  '--felt-inner': 'rgba(40,90,50,0.95)',

  // ===== 自家·手牌 =====
  '--self-hand-gap': 2,
  '--self-hand-maxw': 440,
  '--self-hand-rows': 1,
  '--self-tile-w': 32,
  '--self-tile-h': 45,
  '--self-tile-scale': 100,
  '--self-tile-rotate': 0,
  '--self-hand-dir': 0,
  '--self-hand-reverse': 0,
  '--self-hand-bottom': 0,
  '--self-hand-scale': 120,

  // ===== 自家·门口牌 =====
  '--self-meld-gap': 8,
  '--self-meld-mgap': 3,
  '--self-meld-tile-w': 26,
  '--self-meld-tile-h': 36,
  '--self-meld-dir': 0,
  '--self-meld-rotate': 0,

  // ===== 自家·弃牌区 =====
  '--self-dl-top': 31,
  '--self-dl-cols': 8,
  '--self-dl-tile-w': 22,
  '--self-dl-tile-h': 31,
  '--self-dl-gap': 1,
  '--self-dl-rowgap': 1,
  '--self-dl-rotate': 0,
  '--self-dl-shadow': 0,

  // ===== 对家·手牌 =====
  '--opp-hand-w': 26,
  '--opp-hand-h': 36,
  '--opp-hand-gap': 2,
  '--opp-hand-rotate': 180,
  '--opp-hand-width': 90,
  '--opp-hand-top': 10,
  '--opp-hand-scale': 100,

  // ===== 对家·门口牌 =====
  '--opp-meld-gap': 8,
  '--opp-meld-mgap': 3,
  '--opp-meld-tile-w': 26,
  '--opp-meld-tile-h': 36,
  '--opp-meld-rotate': 180,

  // ===== 对家·弃牌区 =====
  '--opp-dl-top': 31,
  '--opp-dl-cols': 8,
  '--opp-dl-tile-w': 22,
  '--opp-dl-tile-h': 31,
  '--opp-dl-gap': 1,
  '--opp-dl-rowgap': 1,
  '--opp-dl-rotate': 180,
  '--opp-dl-shadow': 0,

  // ===== 上家·手牌 =====
  '--left-hand-w': 26,
  '--left-hand-h': 36,
  '--left-hand-gap': 2,
  '--left-hand-rotate': 90,
  '--left-hand-left': 7,
  '--left-hand-scale': 100,

  // ===== 上家·门口牌 =====
  '--left-meld-gap': 8,
  '--left-meld-mgap': 3,
  '--left-meld-tile-w': 26,
  '--left-meld-tile-h': 36,
  '--left-meld-rotate': 90,

  // ===== 上家·弃牌区 =====
  '--left-dl-left': 21.6,
  '--left-dl-cols': 8,
  '--left-dl-tile-w': 22,
  '--left-dl-tile-h': 31,
  '--left-dl-gap': 1,
  '--left-dl-rowgap': 1,
  '--left-dl-rotate': 90,
  '--left-dl-shadow': 0,

  // ===== 下家·手牌 =====
  '--right-hand-w': 26,
  '--right-hand-h': 36,
  '--right-hand-gap': 2,
  '--right-hand-rotate': -90,
  '--right-hand-right': 7,
  '--right-hand-scale': 100,

  // ===== 下家·门口牌 =====
  '--right-meld-gap': 8,
  '--right-meld-mgap': 3,
  '--right-meld-tile-w': 26,
  '--right-meld-tile-h': 36,
  '--right-meld-rotate': -90,

  // ===== 下家·弃牌区 =====
  '--right-dl-right': 21.6,
  '--right-dl-cols': 8,
  '--right-dl-tile-w': 22,
  '--right-dl-tile-h': 31,
  '--right-dl-gap': 1,
  '--right-dl-rowgap': 1,
  '--right-dl-rotate': -90,
  '--right-dl-shadow': 0,

  // ===== 牌墙 =====
  '--wall-tile-w': 28,
  '--wall-tile-h': 40,
  '--wall-overlap': 30,
  '--wall-voverlap': 30,
  '--wall-layer-offset': 1,
  '--wall-top-pct': 16,
  '--wall-bottom-pct': 16,
  '--wall-left-pct': 16,
  '--wall-right-pct': 16,
  '--wall-opacity': 100,

  // ===== 2.5D 阴影 =====
  '--shadow-depth': 4,
  '--shadow-color': 'rgba(0,0,0,0.3)',
  '--shadow-side-color': '#8a7a5a',
  '--shadow-side-color2': '#6a5a3a',
  '--shadow-self-dir': 0,
  '--shadow-opp-dir': 0,
  '--shadow-left-dir': 0,
  '--shadow-right-dir': 0,
  '--shadow-highlight': 0,

  // ===== 操作按钮 =====
  '--act-panel-w': 100,
  '--act-panel-pad': 12,
  '--act-btn-sz': 44,
  '--act-draw-sz': 72,
  '--act-gap': 6,
  '--act-panel-mt': 0,

  // ===== 名字 =====
  '--lbl-sz': 0.75,
}

const vals = reactive({ ...D })

/* ---------- 分组定义 ---------- */
type Slider = { label: string; var: string; min: number; max: number; step: number; unit: string }
type Group = { name: string; sliders: Slider[] }

const S = (label: string, v: string, min: number, max: number, step: number, unit: string): Slider =>
  ({ label, var: v, min, max, step, unit })

const groups: Group[] = [
  { name: '🃏 牌桌', sliders: [
    S('最大宽度', '--tbl-maxw', 600, 1600, 20, 'px'),
    S('宽高比', '--tbl-aspect', 1.0, 2.0, 0.05, ''),
    S('外框粗细', '--tbl-border', 4, 24, 1, 'px'),
    S('桌布内边距', '--felt-pad', 0, 60, 2, 'px'),
  ] },

  // ===== 自家 =====
  { name: '🫵 自家·手牌', sliders: [
    S('牌宽', '--self-tile-w', 24, 48, 1, 'px'),
    S('牌高', '--self-tile-h', 34, 64, 1, 'px'),
    S('缩放', '--self-tile-scale', 50, 150, 1, '%'),
    S('旋转', '--self-tile-rotate', -180, 180, 5, '°'),
    S('牌间距', '--self-hand-gap', 0, 8, 0.5, 'px'),
    S('最大宽度', '--self-hand-maxw', 200, 900, 10, 'px'),
    S('行数', '--self-hand-rows', 1, 3, 1, ''),
    S('排列', '--self-hand-dir', 0, 1, 1, ''),
    S('反向', '--self-hand-reverse', 0, 1, 1, ''),
    S('整体缩放', '--self-hand-scale', 80, 150, 1, '%'),
    S('离底距离', '--self-hand-bottom', 0, 15, 1, '%'),
  ] },
  { name: '🫵 自家·门口牌', sliders: [
    S('牌宽', '--self-meld-tile-w', 20, 40, 1, 'px'),
    S('牌高', '--self-meld-tile-h', 28, 52, 1, 'px'),
    S('组间距', '--self-meld-gap', 2, 20, 1, 'px'),
    S('门间距', '--self-meld-mgap', 0, 12, 1, 'px'),
    S('排列', '--self-meld-dir', 0, 1, 1, ''),
    S('旋转', '--self-meld-rotate', -180, 180, 5, '°'),
  ] },
  { name: '🫵 自家·弃牌区', sliders: [
    S('距底%', '--self-dl-top', 0, 50, 0.5, '%'),
    S('列数', '--self-dl-cols', 4, 12, 1, ''),
    S('牌宽', '--self-dl-tile-w', 16, 36, 1, 'px'),
    S('牌高', '--self-dl-tile-h', 22, 50, 1, 'px'),
    S('牌间距', '--self-dl-gap', -2, 6, 0.5, 'px'),
    S('行间距', '--self-dl-rowgap', -2, 6, 0.5, 'px'),
    S('区旋转', '--self-dl-rotate', -180, 180, 5, '°'),
    S('阴影方向', '--self-dl-shadow', 0, 3, 1, ''),
  ] },

  // ===== 对家 =====
  { name: '👆 对家·手牌', sliders: [
    S('牌宽', '--opp-hand-w', 20, 40, 1, 'px'),
    S('牌高', '--opp-hand-h', 28, 52, 1, 'px'),
    S('牌间距', '--opp-hand-gap', 0, 8, 0.5, 'px'),
    S('旋转', '--opp-hand-rotate', -180, 180, 5, '°'),
    S('座位宽度%', '--opp-hand-width', 50, 100, 1, '%'),
    S('距顶%', '--opp-hand-top', 0, 30, 0.5, '%'),
    S('整体缩放', '--opp-hand-scale', 50, 150, 1, '%'),
  ] },
  { name: '👆 对家·门口牌', sliders: [
    S('牌宽', '--opp-meld-tile-w', 20, 40, 1, 'px'),
    S('牌高', '--opp-meld-tile-h', 28, 52, 1, 'px'),
    S('组间距', '--opp-meld-gap', 2, 20, 1, 'px'),
    S('门间距', '--opp-meld-mgap', 0, 12, 1, 'px'),
    S('旋转', '--opp-meld-rotate', -180, 180, 5, '°'),
  ] },
  { name: '👆 对家·弃牌区', sliders: [
    S('距顶%', '--opp-dl-top', 0, 50, 0.5, '%'),
    S('列数', '--opp-dl-cols', 4, 12, 1, ''),
    S('牌宽', '--opp-dl-tile-w', 16, 36, 1, 'px'),
    S('牌高', '--opp-dl-tile-h', 22, 50, 1, 'px'),
    S('牌间距', '--opp-dl-gap', -2, 6, 0.5, 'px'),
    S('行间距', '--opp-dl-rowgap', -2, 6, 0.5, 'px'),
    S('区旋转', '--opp-dl-rotate', -180, 180, 5, '°'),
    S('阴影方向', '--opp-dl-shadow', 0, 3, 1, ''),
  ] },

  // ===== 上家 =====
  { name: '👈 上家·手牌', sliders: [
    S('牌宽', '--left-hand-w', 20, 40, 1, 'px'),
    S('牌高', '--left-hand-h', 28, 52, 1, 'px'),
    S('牌间距', '--left-hand-gap', 0, 8, 0.5, 'px'),
    S('旋转', '--left-hand-rotate', -180, 180, 5, '°'),
    S('距左%', '--left-hand-left', 0, 30, 0.5, '%'),
    S('整体缩放', '--left-hand-scale', 50, 150, 1, '%'),
  ] },
  { name: '👈 上家·门口牌', sliders: [
    S('牌宽', '--left-meld-tile-w', 20, 40, 1, 'px'),
    S('牌高', '--left-meld-tile-h', 28, 52, 1, 'px'),
    S('组间距', '--left-meld-gap', 2, 20, 1, 'px'),
    S('门间距', '--left-meld-mgap', 0, 12, 1, 'px'),
    S('旋转', '--left-meld-rotate', -180, 180, 5, '°'),
  ] },
  { name: '👈 上家·弃牌区', sliders: [
    S('距左%', '--left-dl-left', 0, 50, 0.5, '%'),
    S('列数', '--left-dl-cols', 4, 12, 1, ''),
    S('牌宽', '--left-dl-tile-w', 16, 36, 1, 'px'),
    S('牌高', '--left-dl-tile-h', 22, 50, 1, 'px'),
    S('牌间距', '--left-dl-gap', -2, 6, 0.5, 'px'),
    S('行间距', '--left-dl-rowgap', -2, 6, 0.5, 'px'),
    S('区旋转', '--left-dl-rotate', -180, 180, 5, '°'),
    S('阴影方向', '--left-dl-shadow', 0, 3, 1, ''),
  ] },

  // ===== 下家 =====
  { name: '👉 下家·手牌', sliders: [
    S('牌宽', '--right-hand-w', 20, 40, 1, 'px'),
    S('牌高', '--right-hand-h', 28, 52, 1, 'px'),
    S('牌间距', '--right-hand-gap', 0, 8, 0.5, 'px'),
    S('旋转', '--right-hand-rotate', -180, 180, 5, '°'),
    S('距右%', '--right-hand-right', 0, 30, 0.5, '%'),
    S('整体缩放', '--right-hand-scale', 50, 150, 1, '%'),
  ] },
  { name: '👉 下家·门口牌', sliders: [
    S('牌宽', '--right-meld-tile-w', 20, 40, 1, 'px'),
    S('牌高', '--right-meld-tile-h', 28, 52, 1, 'px'),
    S('组间距', '--right-meld-gap', 2, 20, 1, 'px'),
    S('门间距', '--right-meld-mgap', 0, 12, 1, 'px'),
    S('旋转', '--right-meld-rotate', -180, 180, 5, '°'),
  ] },
  { name: '👉 下家·弃牌区', sliders: [
    S('距右%', '--right-dl-right', 0, 50, 0.5, '%'),
    S('列数', '--right-dl-cols', 4, 12, 1, ''),
    S('牌宽', '--right-dl-tile-w', 16, 36, 1, 'px'),
    S('牌高', '--right-dl-tile-h', 22, 50, 1, 'px'),
    S('牌间距', '--right-dl-gap', -2, 6, 0.5, 'px'),
    S('行间距', '--right-dl-rowgap', -2, 6, 0.5, 'px'),
    S('区旋转', '--right-dl-rotate', -180, 180, 5, '°'),
    S('阴影方向', '--right-dl-shadow', 0, 3, 1, ''),
  ] },

  // ===== 牌墙 =====
  { name: '🧱 牌墙', sliders: [
    S('牌宽', '--wall-tile-w', 16, 40, 1, 'px'),
    S('牌高', '--wall-tile-h', 24, 56, 1, 'px'),
    S('水平重叠', '--wall-overlap', 16, 40, 1, 'px'),
    S('垂直重叠', '--wall-voverlap', 16, 40, 1, 'px'),
    S('层偏移', '--wall-layer-offset', 0, 4, 0.5, 'px'),
    S('上墙距顶%', '--wall-top-pct', 5, 30, 0.5, '%'),
    S('下墙距底%', '--wall-bottom-pct', 5, 30, 0.5, '%'),
    S('左墙距左%', '--wall-left-pct', 5, 30, 0.5, '%'),
    S('右墙距右%', '--wall-right-pct', 5, 30, 0.5, '%'),
    S('透明度', '--wall-opacity', 0, 100, 5, '%'),
  ] },

  // ===== 2.5D 阴影 =====
  { name: '🌑 2.5D 阴影', sliders: [
    S('阴影深度', '--shadow-depth', 0, 10, 0.5, 'px'),
    S('侧面颜色1', '--shadow-side-color', 0, 360, 5, 'hue'),
    S('侧面颜色2', '--shadow-side-color2', 0, 360, 5, 'hue'),
    S('自家阴影方向', '--shadow-self-dir', 0, 3, 1, ''),
    S('对家阴影方向', '--shadow-opp-dir', 0, 3, 1, ''),
    S('上家阴影方向', '--shadow-left-dir', 0, 3, 1, ''),
    S('下家阴影方向', '--shadow-right-dir', 0, 3, 1, ''),
    S('高光强度', '--shadow-highlight', 0, 100, 5, '%'),
  ] },

  // ===== 操作按钮 =====
  { name: '🎮 操作按钮', sliders: [
    S('面板宽%', '--act-panel-w', 50, 100, 1, '%'),
    S('内边距', '--act-panel-pad', 4, 24, 1, 'px'),
    S('小按钮', '--act-btn-sz', 28, 64, 1, 'px'),
    S('摸牌钮', '--act-draw-sz', 40, 100, 1, 'px'),
    S('按钮间距', '--act-gap', 2, 16, 1, 'px'),
    S('上边距', '--act-panel-mt', 0, 32, 1, 'px'),
  ] },

  // ===== 名字 =====
  { name: '📛 名字', sliders: [
    S('字号', '--lbl-sz', 0.5, 1.5, 0.05, 'rem'),
  ] },
]

/* ---------- 搜索过滤 ---------- */
const filteredGroups = computed(() => {
  if (!search.value) return groups
  const q = search.value.toLowerCase()
  return groups.map(g => ({
    ...g,
    sliders: g.sliders.filter(s =>
      s.label.toLowerCase().includes(q) || s.var.toLowerCase().includes(q)
    )
  })).filter(g => g.sliders.length > 0 || g.name.toLowerCase().includes(q))
})

/* ---------- helpers ---------- */
const sliders: Record<string, Slider> = {}
for (const g of groups) for (const s of g.sliders) sliders[s.var] = s

function set(v: string, n: number) {
  vals[v] = n
  apply()
}
function fmt(v: string, n: number) {
  return n + (sliders[v]?.unit ?? '')
}

/* ---------- CSS 注入 ---------- */
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

  // 排列方向
  const selfDir = u('--self-hand-dir') === 1 ? 'column' : 'row'
  const selfRev = u('--self-hand-reverse') === 1 ? (selfDir === 'column' ? 'column-reverse' : 'row-reverse') : selfDir
  const selfMeldDir = u('--self-meld-dir') === 1 ? 'column' : 'row'

  // 阴影方向映射: 0=下, 1=上, 2=左, 3=右
  const shadowDirs = [
    { bx: 0, by: 1, sx: 0, sy: -1 },  // 0=下
    { bx: 0, by: -1, sx: 0, sy: 1 },   // 1=上
    { bx: 1, by: 0, sx: -1, sy: 0 },   // 2=左
    { bx: -1, by: 0, sx: 1, sy: 0 },   // 3=右
  ]
  const sd = (dir: number) => shadowDirs[dir % 4]

  const selfSd = sd(u('--shadow-self-dir'))
  const oppSd = sd(u('--shadow-opp-dir'))
  const leftSd = sd(u('--shadow-left-dir'))
  const rightSd = sd(u('--shadow-right-dir'))

  const depth = u('--shadow-depth')
  const sideC1 = u('--shadow-side-color')
  const sideC2 = u('--shadow-side-color2')
  const highlight = u('--shadow-highlight')

  styleEl.textContent = `
    /* ===== 牌桌 ===== */
    .mahjong-table { max-width: ${u('--tbl-maxw')}px !important; aspect-ratio: ${u('--tbl-aspect')} / 1 !important; border-width: ${u('--tbl-border')}px !important; }
    .table-felt { padding: ${u('--felt-pad')}px !important; }

    /* ===== 自家·手牌 ===== */
    .player-hand {
      gap: ${u('--self-hand-gap')}px !important;
      max-width: ${u('--self-hand-maxw')}px !important;
      flex-direction: ${selfDir} !important;
      flex-wrap: ${u('--self-hand-rows') > 1 ? 'wrap' : 'nowrap'} !important;
      transform: scale(${u('--self-hand-scale') / 100}) !important;
    }
    .seat-bottom { bottom: ${u('--self-hand-bottom')}% !important; transform: translateX(-50%) scale(${u('--self-hand-scale') / 100}) translateY(-5%) !important; }
    .player-hand .tile {
      width: ${u('--self-tile-w')}px !important;
      height: ${u('--self-tile-h')}px !important;
      transform: scale(${u('--self-tile-scale') / 100}) rotate(${u('--self-tile-rotate')}deg) !important;
    }

    /* ===== 自家·门口牌 ===== */
    .player-melds { gap: ${u('--self-meld-gap')}px !important; }
    .player-melds .meld { gap: ${u('--self-meld-mgap')}px !important; flex-direction: ${selfMeldDir} !important; }
    .player-melds .tile {
      width: ${u('--self-meld-tile-w')}px !important;
      height: ${u('--self-meld-tile-h')}px !important;
      transform: rotate(${u('--self-meld-rotate')}deg) !important;
    }

    /* ===== 自家·弃牌区 ===== */
    .discard-zone--bottom {
      bottom: ${u('--self-dl-top')}% !important;
      transform: translateX(-50%) rotate(${u('--self-dl-rotate')}deg) !important;
    }
    .discard-zone--bottom .discards-grid {
      grid-template-columns: repeat(${Math.round(u('--self-dl-cols'))}, ${u('--self-dl-tile-w')}px) !important;
      gap: ${u('--self-dl-gap')}px ${u('--self-dl-rowgap')}px !important;
    }
    .discard-zone--bottom .tile {
      width: ${u('--self-dl-tile-w')}px !important;
      height: ${u('--self-dl-tile-h')}px !important;
    }

    /* ===== 对家·手牌 ===== */
    .seat-top {
      width: ${u('--opp-hand-width')}% !important;
      top: ${u('--opp-hand-top')}% !important;
      transform: translateX(-50%) rotate(180deg) scale(${u('--opp-hand-scale') / 100}) !important;
    }
    .seat-top .tile {
      width: ${u('--opp-hand-w')}px !important;
      height: ${u('--opp-hand-h')}px !important;
      transform: rotate(${u('--opp-hand-rotate')}deg) !important;
    }
    .seat-top .hand-segment { gap: ${u('--opp-hand-gap')}px !important; }

    /* ===== 对家·门口牌 ===== */
    .seat-top .meld-group-h { gap: ${u('--opp-meld-gap')}px !important; }
    .seat-top .meld-segment { gap: ${u('--opp-meld-mgap')}px !important; }
    .seat-top .meld-group-h .tile {
      width: ${u('--opp-meld-tile-w')}px !important;
      height: ${u('--opp-meld-tile-h')}px !important;
      transform: rotate(${u('--opp-meld-rotate')}deg) !important;
    }

    /* ===== 对家·弃牌区 ===== */
    .discard-zone--top {
      top: ${u('--opp-dl-top')}% !important;
      transform: translateX(-50%) rotate(${u('--opp-dl-rotate')}deg) !important;
    }
    .discard-zone--top .discards-grid {
      grid-template-columns: repeat(${Math.round(u('--opp-dl-cols'))}, ${u('--opp-dl-tile-w')}px) !important;
      gap: ${u('--opp-dl-gap')}px ${u('--opp-dl-rowgap')}px !important;
    }
    .discard-zone--top .tile {
      width: ${u('--opp-dl-tile-w')}px !important;
      height: ${u('--opp-dl-tile-h')}px !important;
    }

    /* ===== 上家·手牌 ===== */
    .seat-left {
      left: ${u('--left-hand-left')}% !important;
      transform: scale(${u('--left-hand-scale') / 100}) !important;
    }
    .seat-left .tile {
      width: ${u('--left-hand-w')}px !important;
      height: ${u('--left-hand-h')}px !important;
      transform: rotate(${u('--left-hand-rotate')}deg) !important;
    }
    .seat-left .hand-segment { gap: ${u('--left-hand-gap')}px !important; }

    /* ===== 上家·门口牌 ===== */
    .seat-left .meld-group-v { gap: ${u('--left-meld-gap')}px !important; }
    .seat-left .meld-segment { gap: ${u('--left-meld-mgap')}px !important; }
    .seat-left .meld-group-v .tile {
      width: ${u('--left-meld-tile-w')}px !important;
      height: ${u('--left-meld-tile-h')}px !important;
      transform: rotate(${u('--left-meld-rotate')}deg) !important;
    }

    /* ===== 上家·弃牌区 ===== */
    .discard-zone--left {
      left: calc(${u('--left-dl-left')}% + 20px) !important;
      transform: translateY(-50%) rotate(${u('--left-dl-rotate')}deg) !important;
    }
    .discard-zone--left .discards-grid {
      grid-template-columns: repeat(${Math.round(u('--left-dl-cols'))}, ${u('--left-dl-tile-w')}px) !important;
      gap: ${u('--left-dl-gap')}px ${u('--left-dl-rowgap')}px !important;
    }
    .discard-zone--left .tile {
      width: ${u('--left-dl-tile-w')}px !important;
      height: ${u('--left-dl-tile-h')}px !important;
    }

    /* ===== 下家·手牌 ===== */
    .seat-right {
      right: ${u('--right-hand-right')}% !important;
      transform: scale(${u('--right-hand-scale') / 100}) !important;
    }
    .seat-right .tile {
      width: ${u('--right-hand-w')}px !important;
      height: ${u('--right-hand-h')}px !important;
      transform: rotate(${u('--right-hand-rotate')}deg) !important;
    }
    .seat-right .hand-segment { gap: ${u('--right-hand-gap')}px !important; }

    /* ===== 下家·门口牌 ===== */
    .seat-right .meld-group-v { gap: ${u('--right-meld-gap')}px !important; }
    .seat-right .meld-segment { gap: ${u('--right-meld-mgap')}px !important; }
    .seat-right .meld-group-v .tile {
      width: ${u('--right-meld-tile-w')}px !important;
      height: ${u('--right-meld-tile-h')}px !important;
      transform: rotate(${u('--right-meld-rotate')}deg) !important;
    }

    /* ===== 下家·弃牌区 ===== */
    .discard-zone--right {
      right: calc(${u('--right-dl-right')}% + 20px) !important;
      transform: translateY(-50%) rotate(${u('--right-dl-rotate')}deg) !important;
    }
    .discard-zone--right .discards-grid {
      grid-template-columns: repeat(${Math.round(u('--right-dl-cols'))}, ${u('--right-dl-tile-w')}px) !important;
      gap: ${u('--right-dl-gap')}px ${u('--right-dl-rowgap')}px !important;
    }
    .discard-zone--right .tile {
      width: ${u('--right-dl-tile-w')}px !important;
      height: ${u('--right-dl-tile-h')}px !important;
    }

    /* ===== 牌墙 ===== */
    .tile-wall { opacity: ${u('--wall-opacity') / 100} !important; }
    .tile-slot {
      width: ${u('--wall-tile-w')}px !important;
      height: ${u('--wall-tile-h')}px !important;
    }
    .tile-slot--vertical {
      width: ${u('--wall-tile-h')}px !important;
      height: ${u('--wall-tile-w')}px !important;
    }

    /* ===== 2.5D 阴影 ===== */
    .discard-zone--bottom .tile {
      box-shadow:
        ${selfSd.bx * depth}px ${selfSd.by * depth}px ${depth}px rgba(0,0,0,0.3),
        ${selfSd.sx * (depth + 2)}px ${selfSd.sy * (depth + 2)}px 0 hsl(${sideC1}, 30%, 45%),
        ${selfSd.sx * (depth + 4)}px ${selfSd.sy * (depth + 4)}px 0 hsl(${sideC2}, 25%, 35%) !important;
    }
    .discard-zone--top .tile {
      box-shadow:
        ${oppSd.bx * depth}px ${oppSd.by * depth}px ${depth}px rgba(0,0,0,0.3),
        ${oppSd.sx * (depth + 2)}px ${oppSd.sy * (depth + 2)}px 0 hsl(${sideC1}, 30%, 45%),
        ${oppSd.sx * (depth + 4)}px ${oppSd.sy * (depth + 4)}px 0 hsl(${sideC2}, 25%, 35%) !important;
    }
    .discard-zone--left .tile {
      box-shadow:
        ${leftSd.bx * depth}px ${leftSd.by * depth}px ${depth}px rgba(0,0,0,0.3),
        ${leftSd.sx * (depth + 2)}px ${leftSd.sy * (depth + 2)}px 0 hsl(${sideC1}, 30%, 45%),
        ${leftSd.sx * (depth + 4)}px ${leftSd.sy * (depth + 4)}px 0 hsl(${sideC2}, 25%, 35%) !important;
    }
    .discard-zone--right .tile {
      box-shadow:
        ${rightSd.bx * depth}px ${rightSd.by * depth}px ${depth}px rgba(0,0,0,0.3),
        ${rightSd.sx * (depth + 2)}px ${rightSd.sy * (depth + 2)}px 0 hsl(${sideC1}, 30%, 45%),
        ${rightSd.sx * (depth + 4)}px ${rightSd.sy * (depth + 4)}px 0 hsl(${sideC2}, 25%, 35%) !important;
    }

    /* ===== 操作按钮 ===== */
    .action-panel {
      padding: ${u('--act-panel-pad')}px !important;
      width: ${u('--act-panel-w')}% !important;
      margin-top: ${u('--act-panel-mt')}px !important;
    }
    .action-btn--small { width: ${u('--act-btn-sz')}px !important; height: ${u('--act-btn-sz')}px !important; }
    .action-btn--draw { width: ${u('--act-draw-sz')}px !important; height: ${u('--act-draw-sz')}px !important; }
    .action-grid { gap: ${u('--act-gap')}px !important; }
    .action-grid-secondary { gap: ${u('--act-gap')}px !important; }

    /* ===== 名字 ===== */
    .player-name-label { font-size: ${u('--lbl-sz')}rem !important; }
  `
}

function resetAll() {
  Object.assign(vals, D)
  apply()
}

async function copyCSS() {
  const u = (k: string) => vals[k]
  const selfDir = u('--self-hand-dir') === 1 ? 'column' : 'row'
  const css = `/* 告诉小虾米以下参数： */
/* 牌桌 */
.mahjong-table { max-width: ${u('--tbl-maxw')}px; aspect-ratio: ${u('--tbl-aspect')}/1; }

/* 自家手牌 */
.player-hand { gap: ${u('--self-hand-gap')}px; max-width: ${u('--self-hand-maxw')}px; flex-direction: ${selfDir}; }
.player-hand .tile { width: ${u('--self-tile-w')}px; height: ${u('--self-tile-h')}px; transform: scale(${u('--self-tile-scale')/100}) rotate(${u('--self-tile-rotate')}deg); }

/* 对家手牌 */
.seat-top { width: ${u('--opp-hand-width')}%; top: ${u('--opp-hand-top')}%; }
.seat-top .tile { width: ${u('--opp-hand-w')}px; height: ${u('--opp-hand-h')}px; transform: rotate(${u('--opp-hand-rotate')}deg); }

/* 上家手牌 */
.seat-left { left: ${u('--left-hand-left')}%; }
.seat-left .tile { width: ${u('--left-hand-w')}px; height: ${u('--left-hand-h')}px; transform: rotate(${u('--left-hand-rotate')}deg); }

/* 下家手牌 */
.seat-right { right: ${u('--right-hand-right')}%; }
.seat-right .tile { width: ${u('--right-hand-w')}px; height: ${u('--right-hand-h')}px; transform: rotate(${u('--right-hand-rotate')}deg); }

/* 弃牌区 */
.discard-zone--bottom { bottom: ${u('--self-dl-top')}%; }
.discard-zone--top { top: ${u('--opp-dl-top')}%; }
.discard-zone--left { left: calc(${u('--left-dl-left')}% + 20px); }
.discard-zone--right { right: calc(${u('--right-dl-right')}% + 20px); }

/* 牌墙 */
.tile-slot { width: ${u('--wall-tile-w')}px; height: ${u('--wall-tile-h')}px; }

/* 操作按钮 */
.action-panel { padding: ${u('--act-panel-pad')}px; width: ${u('--act-panel-w')}%; }
.action-btn--small { width: ${u('--act-btn-sz')}px; height: ${u('--act-btn-sz')}px; }
.action-btn--draw { width: ${u('--act-draw-sz')}px; height: ${u('--act-draw-sz')}px; }`
  await navigator.clipboard.writeText(css)
}
</script>

<style scoped>
.layout-debug-panel {
  position: fixed; z-index: 9999;
  width: 280px; background: #111118;
  border: 1px solid #00ffaa66; border-radius: 8px;
  color: #eee; font-size: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.7);
  user-select: none;
  transition: background .2s;
  max-height: 90vh; overflow-y: auto;
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

.search-row {
  position: relative; margin-bottom: 10px;
}
.search-input {
  width: 100%; padding: 6px 24px 6px 8px; border-radius: 6px;
  border: 1px solid #333; background: #1a1a2e; color: #eee; font-size: 12px;
  outline: none;
}
.search-input:focus { border-color: #00ffaa; }
.search-clear {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: #888; cursor: pointer; font-size: 14px;
}

.grp { margin-bottom: 6px; }
.grp-title {
  font-weight: 600; font-size: 11px; color: #00ffaa;
  padding: 6px 8px; cursor: pointer;
  border-bottom: 1px solid #222; background: #151520;
  border-radius: 6px 6px 0 0;
  display: flex; align-items: center; gap: 4px;
  user-select: none;
}
.grp-title:hover { background: #1a1a2e; }
.grp-arrow { font-size: 9px; opacity: 0.6; }
.grp-body { padding: 6px 8px 10px; background: #13131a; border-radius: 0 0 6px 6px; }

.row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.row label { min-width: 60px; font-size: 10px; color: #bbb; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row input[type="range"] { flex: 1; height: 14px; }
.v { font-family: ui-monospace, monospace; min-width: 42px; text-align: right; color: #888; font-size: 10px; }

.btns { display: flex; gap: 6px; margin-top: 10px; }
.btns button {
  flex: 1; padding: 6px; font-size: 11px; background: #2a2a3e; color: #ccc;
  border: 1px solid #444; border-radius: 4px; cursor: pointer;
}
.btns button:hover { background: #3a3a56; }
</style>
