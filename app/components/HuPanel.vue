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
          <div class="hu-combo-header">
            <span class="hu-combo-rank">TOP {{ idx + 1 }}</span>
            <span class="hu-combo-score">总赢 {{ getTotalWin(opt) }}</span>
          </div>
          <div class="hu-combo-main">
            <span class="hu-combo-label">{{ cleanLabel(opt.label) }}</span>
            <span class="hu-combo-method">{{ opt.type === 'self_draw' ? '自摸' : '捉冲' }}</span>
          </div>
          <div class="hu-combo-formula">{{ getFormula(opt) }}</div>
          <div v-if="getGroups(opt).length" class="hu-group-list">
            <div
              v-for="(group, groupIndex) in getGroups(opt)"
              :key="`group-${idx}-${groupIndex}`"
              class="hu-group"
            >
              <span class="hu-group-kind">{{ getGroupKind(group.type) }}</span>
              <div class="hu-group-tiles">
                <MahjongTile
                  v-for="tile in group.tiles"
                  :key="tile.id"
                  :tile="tile"
                  :size="28"
                  :small="true"
                />
              </div>
            </div>
          </div>
          <div class="hu-summary-grid">
            <div class="hu-summary-item">
              <span class="hu-summary-key">基础番数</span>
              <span class="hu-summary-value">{{ opt.summary?.baseFan ?? '--' }}</span>
            </div>
            <div class="hu-summary-item">
              <span class="hu-summary-key">额外倍数</span>
              <span class="hu-summary-value">×{{ opt.summary?.extraMultipliers ?? 1 }}</span>
            </div>
            <div class="hu-summary-item">
              <span class="hu-summary-key">骰子倍数</span>
              <span class="hu-summary-value">×{{ opt.summary?.roundMultiplier ?? 1 }}</span>
            </div>
            <div class="hu-summary-item">
              <span class="hu-summary-key">结算倍数</span>
              <span class="hu-summary-value">×{{ opt.summary?.settlementMultiplier ?? 1 }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="hu-panel-actions">
        <button
          v-if="!isReviewMode"
          class="hu-confirm-btn"
          @click="$emit('confirm', selectedIndex ?? 0)"
          :disabled="selectedIndex === null"
        >
          确认胡牌
        </button>
        <button class="hu-cancel-btn" @click="$emit('cancel')">{{ isReviewMode ? '关闭' : '取消' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from '~/components/MahjongTile.vue'

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

const cleanLabel = (label: string) => String(label || '').replace(/Â·è‡ªæ‘¸|Â·æ‰å†²|\(æ— ç™¾æ­Ã—2\)/g, '')
</script>

<style scoped>
.hu-panel-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  backdrop-filter: blur(6px);
}

.hu-panel {
  width: min(860px, 92vw);
  max-height: 84vh;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(15, 30, 22, 0.96), rgba(6, 15, 11, 0.98));
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
}

.hu-panel-title {
  font-size: 1.4rem;
  font-weight: 800;
  text-align: center;
  margin: 0 0 16px;
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
}

.hu-combos {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.hu-combo {
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.hu-combo:hover {
  border-color: rgba(255, 215, 0, 0.3);
  background: rgba(255, 215, 0, 0.03);
}

.hu-combo--selected {
  border-color: rgba(255, 215, 0, 0.6);
  background: rgba(255, 215, 0, 0.06);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.15);
}

.hu-combo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.hu-combo-rank {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgba(255, 230, 150, 0.88);
}

.hu-combo-score {
  font-size: 1.05rem;
  font-weight: 900;
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

.hu-combo-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.hu-combo-label {
  font-size: 1.06rem;
  font-weight: 800;
  color: #fff;
  white-space: normal;
  line-height: 1.45;
}

.hu-combo-method {
  display: none;
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 4px 10px;
}

.hu-combo-formula {
  margin-bottom: 10px;
  font-size: 0.83rem;
  line-height: 1.5;
  color: rgba(255, 240, 190, 0.88);
}

.hu-group-list {
  display: grid;
  gap: 8px;
}

.hu-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.hu-group-kind {
  min-width: 28px;
  font-size: 0.76rem;
  font-weight: 800;
  color: rgba(255, 230, 150, 0.88);
}

.hu-group-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.hu-summary-grid {
  display: none;
  flex-wrap: wrap;
  gap: 8px;
}

.hu-summary-item {
  min-width: 104px;
  flex: 1 1 104px;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.hu-summary-key {
  display: block;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.58);
  margin-bottom: 4px;
}

.hu-summary-value {
  display: block;
  font-size: 0.96rem;
  font-weight: 800;
  color: #fff8da;
}

.hu-panel-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.hu-confirm-btn {
  padding: 12px 32px;
  border-radius: 12px;
  border: 2px solid rgba(255, 215, 0, 0.4);
  background: linear-gradient(135deg, #c62828, #ef5350);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.hu-confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(239, 83, 80, 0.4);
}

.hu-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hu-cancel-btn {
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #f5f5f5;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;
}

.hu-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
