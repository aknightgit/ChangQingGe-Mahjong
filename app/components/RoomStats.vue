<template>
  <div class="room-stats">
    <div class="stats-header">
      <span class="stats-title">🏆 战绩榜</span>
      <span class="stats-round">第 {{ currentRound }} 局</span>
    </div>

    <!-- 积分排名 -->
    <div class="stats-ranking">
      <div
        v-for="(player, i) in rankedPlayers"
        :key="player.id"
        class="rank-row"
        :class="{ 'rank-winner': i === 0 && player.score > 0, 'rank-me': player.isMe }"
      >
        <span class="rank-pos">
          <span class="rank-medal" v-if="i === 0">🥇</span>
          <span class="rank-medal" v-else-if="i === 1">🥈</span>
          <span class="rank-medal" v-else-if="i === 2">🥉</span>
          <span v-else class="rank-num">{{ i + 1 }}</span>
        </span>
        <span class="rank-dot" :class="`dot--${player.color}`"></span>
        <span class="rank-name" :class="{ 'rank-name--me': player.isMe }">{{ player.name }}</span>
        <span v-if="i === 0 && player.score > 0" class="rank-star">⭐</span>
        <span v-if="player.isQJCrossed" class="rank-qj-icon" title="已突破被聚义QJ线">👑</span>
        <span class="rank-score" :class="player.score > 0 ? 'sc-pos' : player.score < 0 ? 'sc-neg' : ''">
          {{ player.score > 0 ? '+' : '' }}{{ player.score }}
        </span>
      </div>
    </div>

    <!-- 战斗风格（表格化） -->
    <div class="stats-style">
      <div class="style-header">⚔️ 战斗风格</div>
      <table class="style-table">
        <thead>
          <tr>
            <th class="style-th-name"></th>
            <th class="style-th">捉冲</th>
            <th class="style-th">均点</th>
            <th class="style-th">自摸</th>
            <th class="style-th">均点</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in rankedPlayers" :key="'s-' + player.id" :class="{ 'row-me': player.isMe }">
            <td class="style-td-name">
              <span class="rank-dot rank-dot--sm" :class="`dot--${player.color}`"></span>
              <span :class="{ 'name-me': player.isMe }">{{ player.name }}</span>
            </td>
            <td class="style-td sc-pos">{{ player.catchRate || 0 }}%</td>
            <td class="style-td sc-pos">{{ player.catchAvg || 0 }}</td>
            <td class="style-td sc-neg">{{ player.selfDrawRate || 0 }}%</td>
            <td class="style-td sc-neg">{{ player.selfDrawAvg || 0 }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 观赛视角（锁定模式） -->
    <div class="stats-spectate">
      <p class="spectate-title">👁️ 观赛视角{{ spectatingId ? '（已锁定）' : '' }}</p>
      <div class="spectate-btns">
        <button
          v-for="p in rankedPlayers"
          :key="'sp-' + p.id"
          class="spectate-btn"
          :class="{ active: spectatingId === p.id, locked: !!spectatingId && spectatingId !== p.id }"
          :disabled="!!spectatingId"
          @click="$emit('spectate', p.id)"
        >{{ p.name }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PlayerStat {
  id: string
  name: string
  score: number
  wins: number
  losses: number
  color: string
  isMe: boolean
  isQJCrossed?: boolean
  catchRate?: number
  catchAvg?: number
  selfDrawRate?: number
  selfDrawAvg?: number
}

const props = defineProps<{
  players: PlayerStat[]
  currentRound: number
  spectatingId?: string | null
}>()

defineEmits<{ spectate: [id: string] }>()

const rankedPlayers = computed(() =>
  [...props.players].sort((a, b) => b.score - a.score)
)
</script>

<style scoped>
.room-stats {
  width: 73%;
  max-width: 100%;
  margin: 0 auto;
  background: linear-gradient(180deg, #1a0a2e 0%, #0d1b3e 50%, #0a2020 100%);
  border-radius: 16px;
  border: 2px solid rgba(255, 215, 0, 0.2);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.3);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #e0e0e0;
  font-size: 0.75rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.15);
}

.stats-title {
  font-size: 1rem;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
}

.stats-round {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

/* 排名 */
.stats-ranking {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}

.rank-row.rank-winner {
  background: rgba(255, 215, 0, 0.12);
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.rank-row.rank-me {
  border-left: 3px solid #ffd700;
}

.rank-medal { font-size: 1rem; }
.rank-num { font-size: 0.75rem; color: rgba(255,255,255,0.4); width: 16px; text-align: center; }

.rank-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.rank-dot--sm { width: 6px; height: 6px; }
.dot--east { background: #f44336; box-shadow: 0 0 4px rgba(244,67,54,0.5); }
.dot--south { background: #4caf50; box-shadow: 0 0 4px rgba(76,175,80,0.5); }
.dot--west { background: #2196f3; box-shadow: 0 0 4px rgba(33,150,243,0.5); }
.dot--north { background: #ffc107; box-shadow: 0 0 4px rgba(255,193,7,0.5); }

.rank-name { flex: 1; font-weight: 600; }
.rank-name--me { color: #ffd700; }
.rank-star { font-size: 0.8rem; animation: glow 1.5s infinite; }
.rank-qj-icon { font-size: 0.85rem; animation: qj-glow 2s infinite; cursor: help; }
@keyframes glow { 0%, 100% { text-shadow: 0 0 4px rgba(255,215,0,0.4); } 50% { text-shadow: 0 0 12px rgba(255,215,0,0.8); } }
@keyframes qj-glow { 0%, 100% { filter: drop-shadow(0 0 3px rgba(239,83,80,0.6)); } 50% { filter: drop-shadow(0 0 8px rgba(239,83,80,0.9)); } }

.rank-score { font-weight: 700; font-size: 0.85rem; }
.sc-pos { color: #66bb6a; }
.sc-neg { color: #ef5350; }

/* 战斗风格表格 */
.stats-style {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.style-header {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
}

.style-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.7rem;
}

.style-th {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
  padding: 2px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.style-th-name {
  text-align: left;
  width: 56px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.style-td {
  text-align: center;
  padding: 4px 4px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.style-td-name {
  text-align: left;
  padding: 4px 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.row-me { background: rgba(255, 215, 0, 0.06); }
.name-me { color: #ffd700; }

/* 观赛 */
.stats-spectate {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.spectate-title {
  font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-bottom: 6px;
}
.spectate-btns { display: flex; flex-wrap: wrap; gap: 4px; }
.spectate-btn {
  padding: 3px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
  font-size: 0.7rem; cursor: pointer; transition: all 0.2s;
}
.spectate-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
.spectate-btn.active {
  background: rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.5); color: #ffd700;
}
.spectate-btn.locked { opacity: 0.3; cursor: not-allowed; }

@media (max-width: 900px) {
  .room-stats { width: 100%; }
}
</style>
