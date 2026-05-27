<template>
  <div v-if="visible" class="hu-panel-overlay" @click.self="$emit('cancel')">
    <div class="hu-panel">
      <h3 class="hu-panel-title">选择胡牌牌型</h3>
      <div class="hu-combos">
        <div
          v-for="(opt, idx) in options"
          :key="idx"
          class="hu-combo"
          :class="{ 'hu-combo--selected': selectedIndex === idx }"
          @click="$emit('select', idx)"
        >
          <div class="hu-combo-row">
            <span class="hu-combo-rank">#{{ idx + 1 }}</span>
            <span class="hu-combo-label">{{ cleanLabel(opt.label) }}</span>
            <span class="hu-combo-method">{{ opt.type === 'self_draw' ? '自摸' : '捉冲' }}</span>
            <span class="hu-combo-total">+{{ getTotalWin(opt) }}</span>
          </div>
          <div v-if="getGroups(opt).length" class="hu-groups">
            <span
              v-for="(group, gi) in getGroups(opt)"
              :key="`g-${gi}`"
              class="hu-group-chip"
            >
              <span class="hu-group-kind">{{ getGroupKind(group.type) }}</span>
              <span
                v-for="tile in group.tiles"
                :key="tile.id"
                class="hu-tile-text"
              >{{ tile.display || tile.value }}</span>
            </span>
          </div>
        </div>
      </div>
      <div class="hu-panel-actions">
        <button
          v-if="!isReviewMode"
          class="hu-confirm-btn"
          @click="$emit('confirm', selectedIndex ?? 0)"
          :disabled="selectedIndex === null"
        >确认胡牌</button>
        <button class="hu-cancel-btn" @click="$emit('cancel')">{{ isReviewMode ? '关闭' : '返回' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  options: any[]
  selectedIndex: number | null
  isReviewMode: boolean
  getTotalWin: (opt: any) => number
  getFormula: (opt: any) => string
  getGroups: (opt: any) => any[]
  getGroupKind: (type: string) => string
}>()

defineEmits<{
  select: [index: number]
  confirm: [index: number]
  cancel: []
}>()

const cleanLabel = (label: string) => String(label || '').replace(/·自摸|·捉冲|\(无百搭×2\)/g, '')
</script>

<style scoped>
.hu-panel-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.72);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; backdrop-filter: blur(6px);
}
.hu-panel {
  width: min(900px, 96vw);
  max-height: 80vh;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(15,30,22,0.96), rgba(6,15,11,0.98));
  border: 1px solid rgba(255,215,0,0.2);
  border-radius: 18px; padding: 20px 14px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.45);
}
.hu-panel-title {
  font-size: 1.2rem; font-weight: 800; text-align: center;
  margin: 0 0 12px; color: #ffd700;
  text-shadow: 0 0 8px rgba(255,215,0,0.3);
}
.hu-combos { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.hu-combo {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 8px 12px;
  cursor: pointer; transition: all 0.15s;
}
.hu-combo:hover { border-color: rgba(255,215,0,0.3); }
.hu-combo--selected { border-color: rgba(255,215,0,0.6); background: rgba(255,215,0,0.06); }
.hu-combo-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;
  white-space: nowrap;
}
.hu-groups { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px; }
.hu-combo-rank { font-size: 0.72rem; font-weight: 800; color: rgba(255,230,150,0.88); min-width: 20px; }
.hu-combo-label { font-size: 0.92rem; font-weight: 800; color: #fff; flex: 1; overflow: visible; text-overflow: unset; white-space: nowrap; }
.hu-combo-method {
  font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.08); border-radius: 999px; padding: 2px 8px;
}
.hu-combo-total { font-size: 0.92rem; font-weight: 900; color: #ffd700; }
.hu-group-chip {
  display: inline-flex; align-items: center; gap: 2px;
  background: rgba(255,255,255,0.05); border-radius: 6px; padding: 3px 7px;
  font-size: 0.82rem; line-height: 1.3;
  white-space: nowrap;
  flex-shrink: 0;
}
.hu-group-kind { font-weight: 800; color: rgba(255,230,150,0.88); margin-right: 2px; }
.hu-tile-text { font-weight: 700; color: #e8e0d0; }
.hu-panel-actions { display: flex; gap: 10px; justify-content: center; }
.hu-confirm-btn {
  padding: 10px 28px; border-radius: 12px;
  border: 2px solid rgba(255,215,0,0.4);
  background: linear-gradient(135deg, #c62828, #ef5350);
  color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer;
}
.hu-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.hu-cancel-btn {
  padding: 10px 22px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05); color: #f5f5f5;
  font-size: 0.95rem; cursor: pointer;
}
</style>
