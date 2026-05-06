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
            <th>玩家</th>
            <th>胡</th>
            <th>冲</th>
            <th>摸</th>
            <th>分</th>
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
              <span class="rank-dot" :class="`dot--${player.color}`"></span>
              <span :class="{ 'name-me': player.isMe }">{{ player.name }}</span>
              <span
                v-if="player.isQJCrossed"
                class="rank-qj-icon"
                :class="{ 'rank-qj-icon--glow': player.qjGlow }"
                title="已突破被聚义QJ线"
              >🤑</span>
            </td>
            <td>{{ player.winCount ?? player.wins ?? 0 }}</td>
            <td>{{ player.discardCount ?? player.losses ?? 0 }}</td>
            <td>{{ player.selfDrawCount ?? 0 }}</td>
            <td class="td-score" :class="player.score > 0 ? 'sc-pos' : player.score < 0 ? 'sc-neg' : ''">
              {{ player.score > 0 ? '+' : '' }}{{ player.score }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="spectatingId" class="stats-spectating">
      👁️ 观赛中：{{ currentSpectatingName }}
      <button class="spectate-stop-btn" @click="$emit('spectate', '')">停止</button>
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
  spectatingId?: string | null
}>()

const emit = defineEmits<{ spectate: [id: string]; nameClick: [player: any] }>()

const rankedPlayers = computed(() =>
  [...props.players].sort((a, b) => b.score - a.score)
)

const currentSpectatingName = computed(() => {
  const target = rankedPlayers.value.find(player => player.id === props.spectatingId)
  return target?.name || ''
})
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

.stats-table-wrap {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.72rem;
}

.stats-table th {
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 600;
  padding: 6px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
}

.stats-table td {
  text-align: center;
  padding: 6px 4px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.td-name {
  text-align: left !important;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
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

.stats-spectate {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.stats-spectate--disabled .spectate-title,
.stats-spectate--disabled .spectate-btn {
  opacity: 0.48;
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
.spectate-btn.pending {
  background: rgba(100, 180, 255, 0.14);
  border-color: rgba(100, 180, 255, 0.45);
  color: #9fd3ff;
}
.spectate-btn.locked { opacity: 0.3; cursor: not-allowed; }
.spectate-tag {
  margin-left: 4px;
  font-size: 0.62rem;
  opacity: 0.75;
}

@media (max-width: 900px) {
  .room-stats { width: 100%; }
}

@media (max-width: 900px) and (orientation: landscape) {
  .room-stats { padding: 3px 4px; gap: 2px; border-radius: 6px; background: rgba(5,14,10,0.85); border: 1px solid rgba(255,215,0,0.12); }
  .stats-header { padding-bottom: 3px; gap: 4px; }
  .stats-title { font-size: 0.65rem; }
  .stats-round { font-size: 0.55rem; }
  .stats-table th { font-size: 0.5rem; padding: 2px 2px; }
  .stats-table td { font-size: 0.52rem; padding: 2px 2px; }
  .td-name { gap: 3px; }
  .rank-dot { width: 5px; height: 5px; }
  .rank-qj-icon { font-size: 0.6rem; }
  .stats-spectating { font-size: 0.5rem; padding: 2px 0 0; }
  .spectate-stop-btn { font-size: 0.48rem; padding: 1px 4px; margin-left: 4px; }
}
</style>
