<template>
  <div class="room-stats">
    <div class="stats-header">
      <span class="stats-title">🏆 战绩榜</span>
      <span class="stats-round">第 {{ currentRound }} 局</span>
    </div>

    <div class="stats-table-wrap">
      <table class="stats-table">
        <thead>
          <tr>
            <th>玩家名</th>
            <th>胡牌</th>
            <th>捉冲</th>
            <th>自摸</th>
            <th>单局最高</th>
            <th>总分</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="player in rankedPlayers"
            :key="player.id"
            :class="{ 'row-me': player.isMe }"
          >
            <td class="td-name"
              @click="player._raw ? $emit('nameClick', player._raw) : $emit('nameClick', player)"
              :class="{ 'name-clickable': true }"
            >
              <span class="td-name-inner">
                <span class="rank-dot" :class="`dot--${player.color}`"></span>
                <span :class="{ 'name-me': player.isMe }">{{ player.name }}</span>
                <span
                  v-if="player.isQJCrossed"
                  class="rank-qj-icon"
                  :class="{ 'rank-qj-icon--glow': player.qjGlow }"
                  title="已突破被聚义QJ线"
                >🤑</span>
              </span>
            </td>
            <td>{{ player.winCount ?? player.wins ?? 0 }}</td>
            <td>{{ player.discardCount ?? player.losses ?? 0 }}</td>
            <td>{{ player.selfDrawCount ?? 0 }}</td>
            <td>{{ player.bestRound ?? '-' }}</td>
            <td class="td-score" :class="player.score > 0 ? 'sc-pos' : player.score < 0 ? 'sc-neg' : ''">
              {{ player.score > 0 ? '+' : '' }}{{ player.score }}
            </td>
          </tr>
        </tbody>
      </table>
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
  qjScore?: number
  qjGlow?: boolean
  winCount?: number
  discardCount?: number
  selfDrawCount?: number
  bestRound?: number | null
  isBot?: boolean
  _raw?: any
}

const props = defineProps<{
  players: PlayerStat[]
  currentRound: number
}>()

const emit = defineEmits<{ nameClick: [player: any] }>()

const rankedPlayers = computed(() =>
  [...props.players].sort((a, b) => b.score - a.score)
)
</script>

<style scoped>
.room-stats {
  width: 100%;
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
  font-size: 0.95rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.15);
}

.stats-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
}

.stats-round {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
}

.stats-table-wrap {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.stats-table th {
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 600;
  padding: 8px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
}

.stats-table td {
  text-align: center;
  padding: 8px 6px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.td-name {
  text-align: left !important;
  white-space: nowrap;
}
.td-name-inner {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.name-clickable { cursor: pointer; }
.name-clickable:hover .name-me { color: #fff; }

.rank-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot--east { background: #f44336; box-shadow: 0 0 4px rgba(244,67,54,0.5); }
.dot--south { background: #4caf50; box-shadow: 0 0 4px rgba(76,175,80,0.5); }
.dot--west { background: #2196f3; box-shadow: 0 0 4px rgba(33,150,243,0.5); }
.dot--north { background: #ffc107; box-shadow: 0 0 4px rgba(255,193,7,0.5); }

.row-me { background: rgba(255, 215, 0, 0.06); }
.name-me { color: #ffd700; }
.rank-qj-icon { font-size: 0.85rem; cursor: help; }
.rank-qj-icon--glow { animation: qj-glow 2s infinite; }
@keyframes qj-glow { 0%, 100% { filter: drop-shadow(0 0 3px rgba(239,83,80,0.6)); } 50% { filter: drop-shadow(0 0 10px rgba(239,83,80,1)); } }

.td-score { font-weight: 700; }
.sc-pos { color: #66bb6a; }
.sc-neg { color: #ef5350; }

@media (max-width: 900px) {
  .room-stats { width: 100%; }
}

@media (max-width: 1100px) and (orientation: landscape) {
  .room-stats { padding: 3px 4px; gap: 2px; border-radius: 6px; background: rgba(5,14,10,0.85); border: 1px solid rgba(255,215,0,0.12); }
  .stats-header { padding-bottom: 3px; gap: 4px; }
  .stats-title { font-size: 0.65rem; }
  .stats-round { font-size: 0.55rem; }
  .stats-table { font-size: 0.65rem; table-layout: fixed; }
  .stats-table th { font-size: 0.45rem; padding: 1px 1px; }
  .stats-table td { font-size: 0.48rem; padding: 1px 1px; }
  .td-name { gap: 2px; max-width: 130px; font-size: 0.6rem; }
  .td-name-inner { font-size: 0.58rem; }
  .rank-dot { width: 4px; height: 4px; flex-shrink: 0; }
  .rank-qj-icon { font-size: 0.5rem; }
}
</style>
