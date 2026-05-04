<template>
  <div v-if="visible" class="settle-overlay">
    <div class="settle-panel">
      <h2 class="settle-title-center">本局输赢</h2>

      <div class="settle-rounds settle-rounds--single">
        <div class="settle-round-card">
          <div v-if="round" class="settle-round-header">
            <span>第 {{ round.roundNumber }} 局</span>
            <span>全局倍数 ×{{ round.effectiveMultiplier }} / 结算倍数 ×{{ round.settlementMultiplier }}</span>
          </div>
          <div class="settle-round-block">
            <div class="settle-table-wrap">
              <table class="settle-round-table settle-round-table--compact">
                <thead>
                  <tr>
                    <th>玩家</th>
                    <th>胡牌牌面</th>
                    <th>花</th>
                    <th>番数</th>
                    <th>门清</th>
                    <th>百搭</th>
                    <th>自摸/捉冲</th>
                    <th>总输赢</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in rows"
                    :key="'current-settle-row-' + row.playerId"
                    :class="{ 'settle-round-table-row--winner': row.isWinner }"
                  >
                    <td>{{ row.playerName }}</td>
                    <td class="settle-round-tiles">{{ row.tiles }}</td>
                    <td>{{ row.flowerCount }}</td>
                    <td>{{ row.baseFan }}</td>
                    <td>{{ row.menQing }}</td>
                    <td>{{ row.wild }}</td>
                    <td>{{ row.winMode }}</td>
                    <td :class="{ 'settle-round-positive': row.score > 0, 'settle-round-negative': row.score < 0 }">
                      {{ row.scoreLabel }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="settle-actions">
        <button v-if="canReviewHuSelection" class="settle-save-btn settle-save-btn--secondary" @click="$emit('review')">
          回看胡牌选择
        </button>
        <button class="settle-save-btn" @click="$emit('next')">
          下一局
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  round: any
  rows: any[]
  canReviewHuSelection: boolean
}>()

defineEmits<{
  review: []
  next: []
}>()
</script>

<style scoped>
.settle-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(3, 10, 8, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
}

.settle-panel {
  background: rgba(4, 16, 11, 0.97);
  border: 1px solid rgba(255, 215, 0, 0.15);
  border-radius: 20px;
  padding: 32px;
  width: fit-content;
  max-width: min(1100px, 96vw);
  max-height: 85vh;
  overflow: visible;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  animation: settle-in 0.3s ease;
}

.settle-title-center {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
  color: #ffd700;
  margin: 0 0 20px;
  letter-spacing: 0.15em;
}

@keyframes settle-in {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.settle-rounds {
  display: grid;
  gap: 14px;
  margin-bottom: 20px;
}

.settle-rounds--single {
  justify-items: center;
}

.settle-round-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.settle-round-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  color: #f7e6a8;
  font-weight: 600;
  font-size: 0.86rem;
}

.settle-round-block {
  display: grid;
  gap: 6px;
}

.settle-table-wrap {
  width: fit-content;
  max-width: min(1040px, 92vw);
  overflow: visible;
}

.settle-round-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: 0.78rem;
  color: #f3f3f3;
}

.settle-round-table--compact {
  min-width: 820px;
  table-layout: fixed;
}

.settle-round-table--compact th,
.settle-round-table--compact td {
  text-align: center;
  vertical-align: middle;
}

.settle-round-table--compact th:nth-child(1),
.settle-round-table--compact td:nth-child(1) {
  width: 96px;
}

.settle-round-table--compact th:nth-child(2),
.settle-round-table--compact td:nth-child(2) {
  width: 290px;
}

.settle-round-table--compact th:nth-child(3),
.settle-round-table--compact td:nth-child(3),
.settle-round-table--compact th:nth-child(4),
.settle-round-table--compact td:nth-child(4),
.settle-round-table--compact th:nth-child(5),
.settle-round-table--compact td:nth-child(5),
.settle-round-table--compact th:nth-child(6),
.settle-round-table--compact td:nth-child(6),
.settle-round-table--compact th:nth-child(7),
.settle-round-table--compact td:nth-child(7) {
  width: 86px;
}

.settle-round-table th,
.settle-round-table td {
  padding: 7px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: left;
  vertical-align: top;
}

.settle-round-table th {
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.06);
  font-weight: 600;
  white-space: nowrap;
}

.settle-round-table-row--winner {
  background: rgba(255, 215, 0, 0.07);
}

.settle-round-tiles {
  min-width: 180px;
  line-height: 1.5;
}

.settle-round-positive {
  color: #66bb6a;
}

.settle-round-negative {
  color: #ef5350;
}

.settle-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.settle-save-btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 48px;
}

.settle-save-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(70, 197, 116, 0.4);
}

.settle-save-btn--secondary {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
  color: #f5f0df;
}

.settle-save-btn--secondary:hover {
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.18);
}
</style>
